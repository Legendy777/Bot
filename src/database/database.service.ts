import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { UserDocument } from './schemas/user.schema';
import { OrderDocument } from './schemas/order.schema';
import { GameDocument } from './schemas/game.schema';

@Injectable()
export class DatabaseService {
  constructor(
    @InjectModel('User') private userModel: Model<UserDocument>,
    @InjectModel('Order') private orderModel: Model<OrderDocument>,
    @InjectModel('Game') private gameModel: Model<GameDocument>,
  ) {}

  async getUserById(userId: string): Promise<UserDocument | null> {
    const user = await this.userModel.findOne({ userId }).exec();
    console.log(`Queried user ${userId} from database. Result: ${JSON.stringify(user, null, 2)}`);
    return user;
  }

  async createUser(userId: string): Promise<UserDocument> {
    const user = new this.userModel({ userId, language: 'ru', balance: 0, refPercent: 1, referrals: [], ordersCount: 0, isSubscribed: false, isBanned: false });
    const savedUser = await user.save();
    console.log(`User ${userId} saved to database with ID: ${savedUser._id}`);
    return savedUser;
  }

  async updateUserLanguage(userId: string, language: string): Promise<void> {
    const result = await this.userModel.updateOne({ userId }, { $set: { language } }).exec();
    console.log(`Updated language for user ${userId} to ${language}. Update result: ${JSON.stringify(result, null, 2)}`);
  }

  async updateSubscriptionStatus(userId: string, status: boolean): Promise<void> {
    await this.userModel.updateOne({ userId }, { $set: { isSubscribed: status } }).exec();
  }

  async getOrders(userId: string): Promise<OrderDocument[]> {
    return this.orderModel.find({ userId }).exec();
  }

  async getOrderCount(userId: string): Promise<number> {
    return this.orderModel.countDocuments({ userId }).exec();
  }

  async getBalance(userId: string, currency: string): Promise<number> {
    const user = await this.getUserById(userId);
    return user ? user.balance : 0;
  }

  // Методы для работы с играми
  async findGames(): Promise<GameDocument[]> {
    return this.gameModel.find({ enabled: true, title: { $ne: null }, gifUrl: { $ne: null } }).exec();
  }

  async getEnabledGames(): Promise<GameDocument[]> {
    console.log('🔍 [getEnabledGames] Searching for enabled games...');
    const totalGames = await this.gameModel.countDocuments().exec();
    console.log(`📊 [getEnabledGames] Total games in database: ${totalGames}`);
    
    const enabledGames = await this.gameModel.find({ enabled: true }).exec();
    console.log(`✅ [getEnabledGames] Found ${enabledGames.length} enabled games`);
    
    if (enabledGames.length > 0) {
      console.log('🎮 [getEnabledGames] Games found:', enabledGames.map(g => ({ id: g.id, title: g.title, enabled: g.enabled, gifUrl: g.gifUrl })));
    }
    
    return enabledGames;
  }

  async getActualGames(): Promise<GameDocument[]> {
    return this.gameModel.find({ enabled: true, isActual: true }).exec();
  }

  async getGameById(gameId: string): Promise<GameDocument | null> {
    return this.gameModel.findOne({ id: gameId }).exec();
  }

  async getDiscountedGames(): Promise<GameDocument[]> {
    return this.gameModel.find({ enabled: true, hasDiscount: true }).exec();
  }

  async getTopGames(limit: number = 10): Promise<GameDocument[]> {
    return this.gameModel.find({ enabled: true, isActual: true }).limit(limit).exec();
  }

  async deleteUser(userId: string): Promise<void> {
    await this.userModel.deleteOne({ userId }).exec();
    console.log(`User ${userId} deleted from database for testing`);
  }

  async banUser(userId: string): Promise<void> {
    const result = await this.userModel.updateOne({ userId }, { $set: { isBanned: true } }).exec();
    console.log(`User ${userId} banned. Update result: ${JSON.stringify(result, null, 2)}`);
  }

  async unbanUser(userId: string): Promise<void> {
    const result = await this.userModel.updateOne({ userId }, { $set: { isBanned: false } }).exec();
    console.log(`User ${userId} unbanned. Update result: ${JSON.stringify(result, null, 2)}`);
  }
 
  async findUser(userId: number) {
    // Implement user search
    return null;
  }

  async updateUser(userId: number, updateData: any) {
    // Implement user update
    return null;
  }

  // Инициализация игр в базе данных
  async initializeGames(): Promise<void> {
    console.log('🚀 [initializeGames] Starting games initialization...');
    const existingGames = await this.gameModel.countDocuments().exec();
    console.log(`📊 [initializeGames] Existing games count: ${existingGames}`);
    
    if (existingGames > 0) {
      console.log(`✅ [initializeGames] Games already exist in database: ${existingGames} games found`);
      // Проверим что игры действительно валидные
      const enabledGames = await this.gameModel.find({ enabled: true }).exec();
      console.log(`🎮 [initializeGames] Enabled games: ${enabledGames.length}`);
      
      // Если игры есть, но ни одна не включена - включаем их
      if (enabledGames.length === 0) {
        console.log('🔧 [initializeGames] No enabled games found, enabling all existing games...');
        const updateResult = await this.gameModel.updateMany({}, { enabled: true }).exec();
        console.log(`✅ [initializeGames] Updated ${updateResult.modifiedCount} games to enabled status`);
      }
      return;
    }
    
    console.log('📝 [initializeGames] No games found, initializing default games...');

    const gamesData = [
      {
        id: "asphalt-legends",
        title: "Asphalt Legends: Unite",
        emoji: "🏎️",
        image: "https://i.ibb.co/MDP858jV/asphalt.jpg",
        gifUrl: "https://media.giphy.com/media/xT9IgG50Fb7Mi0prBC/giphy.gif",
        hasDiscount: true,
        isActual: true,
        enabled: true,
        appStoreUrl: "https://apps.apple.com/ua/app/asphalt-legends-unite/id805603214?l=ru",
        googlePlayUrl: "https://play.google.com/store/apps/details?id=com.gameloft.android.ANMP.GloftA9HM&hl=ru",
        trailerUrl: "https://www.youtube.com/watch?v=def456UVW"
      },
      {
        id: "fifa-mobile",
        title: "EA SPORTS FC Mobile",
        emoji: "⚽",
        image: "https://i.ibb.co/example/fifa.jpg",
        gifUrl: "https://media.giphy.com/media/l2SpMUEMRJkkqYcta/giphy.gif",
        hasDiscount: false,
        isActual: true,
        enabled: true,
        appStoreUrl: "https://apps.apple.com/app/fifa-mobile/id1094130054",
        googlePlayUrl: "https://play.google.com/store/apps/details?id=com.ea.gp.fifamobile",
        trailerUrl: "https://www.youtube.com/watch?v=example"
      }
    ];

    try {
      await this.gameModel.insertMany(gamesData);
      console.log(`Successfully initialized ${gamesData.length} games in database`);
    } catch (error) {
      console.error('Error initializing games:', error);
    }
  }
}
