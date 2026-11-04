import { Injectable, NotFoundException } from '@nestjs/common';
import { Model, Types } from 'mongoose';
import { InjectModel } from '@nestjs/mongoose';
import { Entry, EntryDocument, FlightType } from './schemas/entry.schema';
import { CreateEntryDto } from './dto/create-entry.dto';
import { UpdateEntryDto } from './dto/update-entry.dto';
import { mapEntryToResponse } from './mappers/entry.mapper';
import { EntryResponseDto } from './dto/entry-response.dto';

@Injectable()
export class EntriesService {
  constructor(
    @InjectModel(Entry.name) private readonly entryModel: Model<EntryDocument>,
  ) {}

  async create(userId: string, dto: CreateEntryDto): Promise<EntryResponseDto> {
    const entry = await this.entryModel.create({ ...dto, user: userId });
    return mapEntryToResponse(entry);
  }

  async importEntries(
    userId: string,
    entriesDto: CreateEntryDto[],
  ): Promise<EntryResponseDto[]> {
    const user = new Types.ObjectId(userId);
    const entriesWithUser = entriesDto.map((entry) => ({ ...entry, user }));

    const entries = await this.entryModel.insertMany(entriesWithUser);
    return entries.map(mapEntryToResponse);
  }

  async findAll(
    userId: string,
    date?: string,
    type?: FlightType,
  ): Promise<EntryResponseDto[]> {
    const filter = {
      user: userId,
      ...(date && { date }),
      ...(type && { type }),
    };
    const entries = await this.entryModel
      .find(filter)
      .sort({ date: -1, createdAt: -1 })
      .exec();
    return entries.map(mapEntryToResponse);
  }

  async update(
    id: string,
    userId: string,
    dto: UpdateEntryDto,
  ): Promise<EntryResponseDto> {
    const updatedEntry = await this.entryModel
      .findOneAndUpdate(
        { _id: id, user: userId },
        { $set: dto },
        { returnDocument: 'after', runValidators: true },
      )
      .exec();

    if (!updatedEntry) throw new NotFoundException('Entry not found');
    return mapEntryToResponse(updatedEntry);
  }

  async remove(id: string, userId: string) {
    const entry = await this.entryModel
      .findOneAndDelete({
        _id: id,
        user: userId,
      })
      .exec();
    if (!entry) throw new NotFoundException('Entry not found');
    return { ok: true };
  }
}
