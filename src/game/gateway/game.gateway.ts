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
export class RoomWebsocketGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer() server: Server;

  constructor(private readonly gameSessionService: GameSessionService) {}

  async handleConnection(client: Socket): Promise<void> {
    console.log("connexion");
    const token = (client.handshake.auth?.token
      ?? client.handshake.query?.token) as string | undefined;

    if (!token) {
      client.emit('error', { message: 'Authentication required' });
      client.disconnect();
      return;
    }

    const session = await auth.api.getSession({
      headers: new Headers({ cookie: `better-auth.session_token=${token}` }),
    });

    if (!session?.user) {
      client.emit('error', { message: 'Invalid session' });
      client.disconnect();
      return;
    }

    const code = client.handshake.query.code as string;
    if (!code) {
      client.emit('error', { message: 'Game code required' });
      client.disconnect();
      return;
    }

    const game = await this.gameSessionService.getGame(code);
    if (!game) {
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
      friendCode: session.user.friendCode as string,
      hasAnswered: false,
      answer: null,
    });

    client.join(`game:${code}`);
    this.server.to(`game:${code}`).emit('players', players);
    this.server.to(client.id).emit('status', game.status);
    this.server.to(client.id).emit('game', game);

    if (game.currentQuestion) {
      this.server.to(client.id).emit('currentQuestion', {
        question: game.currentQuestion,
        questionType: game.gameType,
        userTarget: null,
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

    const players = await this.gameSessionService.removePlayer(code, client.id);
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
    if (game?.hostId !== client.data.user.id) {
      client.emit('error', { message: 'Only the host can request the next question' });
      return;
    }

    await this.sendNextQuestion(client.data.code);
  }

  private async sendNextQuestion(code: string): Promise<void> {
    const result = await this.gameSessionService.getNextQuestion(code);

    if (!result) {
      this.server.to(`game:${code}`).emit('gameOver', {});
      return;
    }

    this.server.to(`game:${code}`).emit('answersCount', 0);
    this.server.to(`game:${code}`).emit('currentQuestion', result);
  }
}
