import { vi } from 'vitest';
import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { Types } from 'mongoose';
import { EntriesService } from './entries.service';
import { Entry, FlightType } from './schemas/entry.schema';
import { CreateEntryDto } from './dto/create-entry.dto';

describe('EntriesService', () => {
  let service: EntriesService;

  const userId = '64b7f0c2a1b2c3d4e5f60718';
  const userObjectId = new Types.ObjectId(userId);

  const mockEntryModel = {
    insertMany: vi.fn(),
  };

  const makeDoc = (id: string, dto: CreateEntryDto) => ({
    _id: { toString: () => id },
    user: userObjectId,
    createdAt: new Date(),
    updatedAt: new Date(),
    __v: 0,
    ...dto,
  });

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EntriesService,
        { provide: getModelToken(Entry.name), useValue: mockEntryModel },
      ],
    }).compile();

    service = module.get(EntriesService);
    vi.clearAllMocks();
  });

  describe('importEntries', () => {
    const entries: CreateEntryDto[] = [
      { type: FlightType.INDIVIDUAL, date: '2026-03-02', minutes: 15 },
      {
        type: FlightType.SHARED,
        date: '2026-03-03',
        minutes: 10,
        note: 'entry 2',
      },
    ];

    it('should insert entries with the userId and return mapped response DTOs', async () => {
      mockEntryModel.insertMany.mockResolvedValue(
        entries.map((e, i) => makeDoc(`entry${i}`, e)),
      );

      const result = await service.importEntries(userId, entries);

      expect(mockEntryModel.insertMany).toHaveBeenCalledWith(
        entries.map((e) => ({ ...e, user: userObjectId })),
      );
      expect(result).toEqual([
        {
          id: 'entry0',
          type: FlightType.INDIVIDUAL,
          date: '2026-03-02',
          minutes: 15,
          note: undefined,
        },
        {
          id: 'entry1',
          type: FlightType.SHARED,
          date: '2026-03-03',
          minutes: 10,
          note: 'entry 2',
        },
      ]);
    });

    it('should not expose user, _id or timestamps in the response', async () => {
      mockEntryModel.insertMany.mockResolvedValue(
        entries.map((e, i) => makeDoc(`entry${i}`, e)),
      );

      const result = await service.importEntries(userId, entries);

      for (const entry of result) {
        expect(entry).not.toHaveProperty('user');
        expect(entry).not.toHaveProperty('_id');
        expect(entry).not.toHaveProperty('createdAt');
        expect(entry).not.toHaveProperty('__v');
      }
    });

    it('should override a client-supplied user with the authenticated userId', async () => {
      mockEntryModel.insertMany.mockResolvedValue([]);

      await service.importEntries(userId, [
        { ...entries[0], user: 'someoneElse' },
      ]);

      expect(mockEntryModel.insertMany).toHaveBeenCalledWith([
        { ...entries[0], user: userObjectId },
      ]);
    });

    it('should return an empty array when importing no entries', async () => {
      mockEntryModel.insertMany.mockResolvedValue([]);

      await expect(service.importEntries(userId, [])).resolves.toEqual([]);
    });
  });
});
