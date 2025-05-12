import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User, UserDocument } from './schemas/user.schema';
import { Order, OrderDocument } from './schemas/order.schema';
import { Game, GameDocument } from './schemas/game.schema';

@Injectable()
export class DatabaseService {
  constructor(
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    @InjectModel(Order.name) private orderModel: Model<OrderDocument>,
    @InjectModel(Game.name) private gameModel: Model<GameDocument>,
  ) {}

  async getUserById(userId: string): Promise<UserDocument | null> {
    return this.userModel.findOne({ userId }).exec();
  }

  async createUser(userId: string): Promise<UserDocument> {
    const user = new this.userModel({ userId, language: 'ru', balance: 0, refPercent: 5, referrals: [] });
    return user.save();
  }

  async updateUserLanguage(userId: string, language: string): Promise<void> {
    await this.userModel.updateOne({ userId }, { $set: { language } }).exec();
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

  async findGames(): Promise<GameDocument[]> {
    return this.gameModel.find().exec();
  }

  async findUser(userId: number) {
    // Implement user search
    return null;
  }

  async updateUser(userId: number, updateData: any) {
    // Implement user update
    return null;
  }
}