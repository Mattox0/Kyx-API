import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { LoggerMiddleware } from './common/middleware/logger.middleware.js';
import { ModeExistsConstraint } from './common/validators/mode-exists.validator.js';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule, TypeOrmModuleAsyncOptions } from '@nestjs/typeorm';
import { TruthDareModule } from './truth-dare/truth-dare.module.js';
import { TruthDare } from './truth-dare/entities/truth-dare.entity.js';
import { TruthDareTranslation } from './truth-dare/entities/truth-dare-translation.entity.js';
import { NeverHaveModule } from './never-have/never-have.module.js';
import { PreferModule } from './prefer/prefer.module.js';
import { Prefer } from './prefer/entities/prefer.entity.js';
import { PreferTranslation } from './prefer/entities/prefer-translation.entity.js';
import { NeverHave } from './never-have/entities/never-have.entity.js';
import { NeverHaveTranslation } from './never-have/entities/never-have-translation.entity.js';
import { Mode } from './mode/entities/mode.entity.js';
import { ModeTranslation } from './mode/entities/mode-translation.entity.js';
import { ModeModule } from './mode/mode.module.js';
import { AdminUser } from './admin-users/entities/admin-user.entity.js';
import { AdminUserModule } from './admin-users/admin-user.module.js';
import { Report } from './report/entities/report.entity.js';
import { ReportModule } from './report/report.module.js';
import { User } from './users/entities/user.entity.js';
import { auth } from './auth.js';
import { Suggestion } from './suggestion/entities/suggestion.entity.js';
import { SuggestionModule } from './suggestion/suggestion.module.js';
import { AuthModule } from '@thallesp/nestjs-better-auth';
import { AdminAuthModule } from './auth/admin.auth.js';
import { UserModule } from './users/user.module.js';
import { FriendModule } from './friend/friend.module.js';
import { GameModule } from './game/game.module.js';
import { RedisModule } from './redis/redis.module.js';
import { RevenueCatModule } from './revenuecat/revenuecat.module.js';
import { FinanceModule } from './finance/finance.module.js';
import { NotificationModule } from './notification/notification.module.js';
import { DeviceToken } from './notification/entities/device-token.entity.js';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env', '.env.local'],
    }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        type: 'postgres',
        host: configService.getOrThrow<string>('POSTGRES_HOST'),
        port: configService.getOrThrow<number>('POSTGRES_PORT'),
        username: configService.getOrThrow<string>('POSTGRES_USER'),
        password: configService.getOrThrow<string>('POSTGRES_PASSWORD'),
        database: configService.getOrThrow<string>('POSTGRES_DATABASE'),
        entities: [TruthDare, TruthDareTranslation, Prefer, PreferTranslation, NeverHave, NeverHaveTranslation, Mode, ModeTranslation, AdminUser, User, Report, Suggestion, DeviceToken],
        autoLoadEntities: true,
        synchronize: false,
        extra: {
          ssl: configService.getOrThrow('POSTGRES_SSL') === 'true',
        },
      }),
      inject: [ConfigService],
    } as TypeOrmModuleAsyncOptions),
    ScheduleModule.forRoot(),
    AuthModule.forRoot({ auth, disableGlobalAuthGuard: true }),
    TruthDareModule,
    NeverHaveModule,
    PreferModule,
    ModeModule,
    AdminUserModule,
    ReportModule,
    SuggestionModule,
    AdminAuthModule,
    UserModule,
    FriendModule,
    GameModule,
    RedisModule,
    RevenueCatModule,
    FinanceModule,
    NotificationModule,
  ],
  controllers: [],
  providers: [ModeExistsConstraint],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(LoggerMiddleware).forRoutes('{*path}');
  }
}
