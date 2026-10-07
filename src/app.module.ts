import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CardsModule } from './cards/cards.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({ type: 'mysql', host: config.get<string>('DB_HOST', 'localhost'), port: config.get<number>('DB_PORT', 3306), username: config.get<string>('DB_USERNAME', 'root'), password: config.get<string>('DB_PASSWORD', ''), database: config.get<string>('DB_DATABASE'), autoLoadEntities: true, synchronize: false }),
    }),
    CardsModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
