import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Namespace, Server, Socket } from 'socket.io';
import { auth } from '../../auth.js';
import { GameSessionService } from '../service/game-session.service.js';
import { Gender } from '../../../types/enums/Gender.js';
import { GameStatus } from '../../../types/ws/GameStatus.js';
import {
  AvatarOptions,
  PlayerSession,
} from '../../../types/ws/PlayerSession.js';

@WebSocketGateway({ cors: '*', namespace: 'game', transports: ['websocket'] })
export class GameQuestionWebsocketGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer() server: Server;

  constructor(private readonly gameSessionService: GameSessionService) {}

  async handleConnection(client: Socket): Promise<void> {
    const cookie = client.handshake.auth?.cookie as string | undefined
      ?? client.handshake.headers?.cookie as string | undefined;

    if (!cookie) {
      client.emit('error', { message: 'Authentication required' });
      client.disconnect();
      return;
    }

    const session = await auth.api.getSession({
      headers: new Headers({ cookie }),
    });

    if (!session?.user) {
      client.emit('error', { message: 'Invalid session' });
      client.disconnect();
      return;
    }

    const code = client.handshake.query.code as string;
    if (!code) {
      console.log(`[WS] Rejected: no game code`);
      client.emit('error', { message: 'Game code required' });
      client.disconnect();
      return;
    }

    const game = await this.gameSessionService.getGame(code);
    if (!game) {
      console.log(`[WS] Rejected: game not found (code: ${code})`);
      client.emit('error', { message: 'Game not found' });
      client.disconnect();
      return;
    }

    client.data.user = { socketId: client.id, ...session.user };
    client.data.code = code;

    const players = await this.gameSessionService.addPlayer(code, {
      id: session.user.id,
      name: session.user.name,
      socketId: client.id,
      isHost: game.hostId === session.user.id,
      gender: session.user.gender as Gender,
      avatarOptions: session.user.avatarOptions as AvatarOptions,
      hasAnswered: false,
      answer: null,
    });

    await this.gameSessionService.setUserCurrentGame(session.user.id, code);

    client.join(`game:${code}`);
    this.server.to(`game:${code}`).emit('players', players);
    this.server.to(client.id).emit('status', game.status);
    this.server.to(client.id).emit('game', game);

    if (game.currentQuestion) {
      const allPlayers = await this.gameSessionService.getPlayers(code);
      const currentUserTarget = game.currentUserTargetId
        ? allPlayers.find((p) => p.id === game.currentUserTargetId) ?? null
        : null;
      const currentUserMentioned = game.currentUserMentionedId
        ? allPlayers.find((p) => p.id === game.currentUserMentionedId) ?? null
        : null;
      this.server.to(client.id).emit('currentQuestion', {
        question: game.currentQuestion,
        questionType: game.gameType,
        userTarget: currentUserTarget,
        userMentioned: currentUserMentioned,
        questionNumber: game.previousQuestionsIds.length,
      });
    }

    const answered = players.filter((p) => p.hasAnswered).length;
    this.server.to(client.id).emit('answersCount', answered);

    if (players.every((p) => p.hasAnswered)) {
      const results = this.gameSessionService.computeResults(players);
      this.server.to(client.id).emit('results', results);
    }

    console.log(`[Game ${code}] ${session.user.name} connected (socket: ${client.id})`);
  }

  @SubscribeMessage('kickUser')
  async handleKickUser(@ConnectedSocket() client: Socket, @MessageBody() payload: { userId: string }): Promise<void> {
    const game = await this.gameSessionService.getGame(client.data.code);
    if (game?.hostId !== client.data.user.id) {
      client.emit('error', { message: 'Only the host can kick players' });
      return;
    }

    const target: PlayerSession | null = await this.gameSessionService.findPlayer(client.data.code, payload.userId);
    if (!target) return;

    const players = await this.gameSessionService.removePlayer(client.data.code, target.socketId);

    await this.gameSessionService.clearUserCurrentGame(target.id);

    const targetSocket = (this.server as unknown as Namespace).sockets.get(target.socketId);
    targetSocket?.emit('kicked', { message: 'You have been kicked from the game' });
    targetSocket?.disconnect();

    this.server.to(`game:${client.data.code}`).emit('playerLeft', { userId: target.id, players });

    console.log(`[Game ${client.data.code}] ${target.name} was kicked by ${client.data.user.name}`);
  }

  async handleDisconnect(client: Socket): Promise<void> {
    const code = client.data?.code as string | undefined;
    const user = client.data?.user as PlayerSession;

    if (!code || !user) return;

    await this.gameSessionService.clearUserCurrentGame(user.id);

    let players = await this.gameSessionService.removePlayer(code, client.id);

    const roomSize = (this.server as unknown as Namespace).adapter.rooms?.get(`game:${code}`)?.size ?? 0;

    if (roomSize === 0) {
      await this.gameSessionService.cleanupGame(code);
      console.log(`[Game ${code}] All players left, session cleaned up`);
      return;
    }

    const game = await this.gameSessionService.getGame(code);
    if (game && game.hostId === user.id && players.length > 0) {
      const newHost = players[0];
      players = await this.gameSessionService.transferHost(code, newHost.id);
      this.server.to(`game:${code}`).emit('newHost', { hostId: newHost.id });
      console.log(`[Game ${code}] Host transferred to ${newHost.name}`);
    }

    this.server.to(`game:${code}`).emit('players', players);

    console.log(`[Game ${code}] ${user.name} disconnected`);
  }

  @SubscribeMessage('startGame')
  async handleStartGame(@ConnectedSocket() client: Socket): Promise<void> {
    const game = await this.gameSessionService.getGame(client.data.code);
    if (game?.hostId !== client.data.user.id) {
      client.emit('error', { message: 'Only the host can start the game' });
      return;
    }

    if (game?.status === GameStatus.FINISHED) {
      await this.gameSessionService.restartGame(client.data.code);
    }

    this.server.to(`game:${client.data.code}`).emit('answersCount', 0);

    await this.sendNextQuestion(client.data.code);

    await this.gameSessionService.startGame(client.data.code);
    this.server.to(`game:${client.data.code}`).emit('status', GameStatus.IN_PROGRESS);
  }

  @SubscribeMessage('submitAnswer')
  async handleSubmitAnswer(@ConnectedSocket() client: Socket, @MessageBody() payload: { answer: string }): Promise<void> {
    const code = client.data.code as string;

    const { players, allAnswered, results } = await this.gameSessionService.submitAnswer(code, client.id, payload.answer);

    this.server.to(`game:${code}`).emit('players', players);

    const answered = players.filter((p) => p.hasAnswered).length;
    this.server.to(`game:${code}`).emit('answersCount', answered);

    if (allAnswered) {
      this.server.to(`game:${code}`).emit('results', results);
    }
  }

  @SubscribeMessage('nextQuestion')
  async handleNextQuestion(@ConnectedSocket() client: Socket): Promise<void> {
    const game = await this.gameSessionService.getGame(client.data.code);
    const userId = client.data.user.id;
    const isHost = game?.hostId === userId;
    const isTarget = game?.currentUserTargetId === userId;

    if (!isHost && !isTarget) {
      client.emit('error', { message: 'Only the host or the current target can request the next question' });
      return;
    }

    await this.sendNextQuestion(client.data.code);
  }

  private async sendNextQuestion(code: string): Promise<void> {
    const result = await this.gameSessionService.getNextQuestion(code);

    if (!result) {
      await this.gameSessionService.endGame(code);
      this.server.to(`game:${code}`).emit('gameOver', {});
      return;
    }

    this.server.to(`game:${code}`).emit('answersCount', 0);
    this.server.to(`game:${code}`).emit('currentQuestion', result);
  }
}
