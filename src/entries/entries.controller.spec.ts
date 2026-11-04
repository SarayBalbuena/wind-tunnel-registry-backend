import { expect, vi } from 'vitest';
import { Request } from 'express';
import { Test, TestingModule } from '@nestjs/testing';
import { EntriesController } from './entries.controller';
import { EntriesService } from './entries.service';
import { FlightType } from './schemas/entry.schema';
import { NotFoundException } from '@nestjs/common';
import { FindEntriesDto } from './dto/findEntries.dto';

describe('EntriesController', () => {
  let entriesController: EntriesController;

  const mockEntriesService = {
    create: vi.fn(),
    importEntries: vi.fn(),
    findAll: vi.fn(),
    update: vi.fn(),
    remove: vi.fn(),
  };

  const mockUser = {
    _id: { toString: () => 'id' },
    email: 'tester@test.com',
  };

  const mockRequest = {
    user: mockUser,
  } as unknown as Request;

  beforeEach(async () => {
    const app: TestingModule = await Test.createTestingModule({
      controllers: [EntriesController],
      providers: [
        {
          provide: EntriesService,
          useValue: mockEntriesService,
        },
      ],
    }).compile();

    entriesController = app.get<EntriesController>(EntriesController);

    vi.clearAllMocks();
  });

  describe('create', () => {
    describe('success', () => {
      it('should create a new entry for userId', async () => {
        const createEntryDto = {
          type: FlightType.INDIVIDUAL,
          date: '2026-03-02',
          minutes: 15,
          note: 'new note',
        };

        const expectedResult = {
          _id: 'entryId',
          ...createEntryDto,
        };

        mockEntriesService.create.mockResolvedValue(expectedResult);

        const result = await entriesController.create(
          createEntryDto,
          mockRequest,
        );

        expect(mockEntriesService.create).toHaveBeenCalledWith(
          'id',
          createEntryDto,
        );
        expect(result).toEqual(expectedResult);
      });
    });
    describe('not success', () => {
      it('should throw an error when service fails', async () => {
        const createEntryDto = {
          type: FlightType.INDIVIDUAL,
          date: '2026-03-02',
          minutes: 15,
          note: 'new note',
        };

        mockEntriesService.create.mockRejectedValue(
          new NotFoundException('Entry not found'),
        );

        await expect(
          entriesController.create(createEntryDto, mockRequest),
        ).rejects.toThrow('Entry not found');

        expect(mockEntriesService.create).toHaveBeenCalledWith(
          'id',
          createEntryDto,
        );
      });
    });
  });
  describe('update', () => {
    const updateEntryDto = {
      type: FlightType.INDIVIDUAL,
      date: '2026-03-02',
      minutes: 15,
      note: 'note update',
    };

    it('should update a entry for userId', async () => {
      const expectedResult = {
        _id: 'entryId',
        ...updateEntryDto,
      };

      mockEntriesService.update.mockResolvedValue(expectedResult);

      const result = await entriesController.update(
        'entryId',
        updateEntryDto,
        mockRequest,
      );

      expect(mockEntriesService.update).toHaveBeenCalledWith(
        'entryId',
        'id',
        updateEntryDto,
      );
      expect(result).toEqual(expectedResult);
    });

    it('should throw NotFoundException when entry does not exist', async () => {
      mockEntriesService.update.mockRejectedValue(
        new NotFoundException('Entry not found'),
      );

      await expect(
        entriesController.update('nonExistentId', updateEntryDto, mockRequest),
      ).rejects.toThrow(NotFoundException);

      expect(mockEntriesService.update).toHaveBeenCalledWith(
        'nonExistentId',
        'id',
        updateEntryDto,
      );
    });
  });
  describe('remove', () => {
    it('should remove a entry for userId', async () => {
      const mockResult = { ok: true };
      mockEntriesService.remove.mockResolvedValue(mockResult);

      const result = await entriesController.remove('entryId', mockRequest);

      expect(mockEntriesService.remove).toHaveBeenCalledWith('entryId', 'id');
      expect(result).toEqual(mockResult);
    });

    it('should throw NotFoundException when trying to remove a non-existent entry', async () => {
      mockEntriesService.remove.mockRejectedValue(
        new NotFoundException('Entry not found'),
      );

      await expect(
        entriesController.remove('nonExistentId', mockRequest),
      ).rejects.toThrow(NotFoundException);

      expect(mockEntriesService.remove).toHaveBeenCalledWith(
        'nonExistentId',
        'id',
      );
    });
  });
  describe('list', () => {
    it('should list only entries for a specific date when date is provided', async () => {
      const dateToFind = '2026-03-03';
      const query = { date: dateToFind } as FindEntriesDto;
      const allEntries = [
        {
          _id: '1',
          type: FlightType.INDIVIDUAL,
          date: '2026-03-02',
          minutes: 15,
        },
        {
          _id: '2',
          type: FlightType.SHARED,
          date: '2026-03-03',
          minutes: 30,
        },
        {
          _id: '3',
          type: FlightType.INDIVIDUAL,
          date: '2026-03-03',
          minutes: 10,
        },
      ];

      const filteredEntries = allEntries.filter((e) => e.date === dateToFind);
      mockEntriesService.findAll.mockResolvedValue(filteredEntries);

      const result = await entriesController.list(query, mockRequest);

      expect(mockEntriesService.findAll).toHaveBeenCalledWith(
        'id',
        dateToFind,
        undefined,
      );

      expect(result).toHaveLength(2);
      expect(result).toEqual(filteredEntries);
    });
    it('should list only entries for a specific type when type is provided', async () => {
      const typeToFind = FlightType.SHARED;
      const findEntriesDto = { type: typeToFind };
      const allEntries = [
        {
          _id: '1',
          type: FlightType.INDIVIDUAL,
          date: '2026-03-02',
          minutes: 15,
        },
        {
          _id: '2',
          type: FlightType.SHARED,
          date: '2026-03-03',
          minutes: 30,
        },
      ];

      const filteredEntries = allEntries.filter((e) => e.type === typeToFind);
      mockEntriesService.findAll.mockResolvedValue(filteredEntries);

      const result = await entriesController.list(findEntriesDto, mockRequest);

      expect(mockEntriesService.findAll).toHaveBeenCalledWith(
        'id',
        undefined,
        typeToFind,
      );

      expect(result).toHaveLength(1);
      expect(result).toEqual(filteredEntries);
    });
    it('should list all entries for userId when no query is provided', async () => {
      const allEntries = [{ _id: '1' }, { _id: '2' }, { _id: '3' }];
      mockEntriesService.findAll.mockResolvedValue(allEntries);

      const result = await entriesController.list({}, mockRequest);

      expect(mockEntriesService.findAll).toHaveBeenCalledWith(
        'id',
        undefined,
        undefined,
      );
      expect(result).toEqual(allEntries);
    });
  });
  describe('import', () => {
    it('should import entries for userId and return the service result', async () => {
      const entriesToImport = [
        {
          type: FlightType.INDIVIDUAL,
          date: '2026-03-02',
          minutes: 15,
          note: 'entry 1',
        },
        {
          type: FlightType.SHARED,
          date: '2026-03-03',
          minutes: 10,
          note: 'entry 2',
        },
        {
          type: FlightType.INDIVIDUAL,
          date: '2026-03-03',
          minutes: 15,
          note: 'entry 3',
        },
      ];

      mockEntriesService.importEntries.mockResolvedValue(entriesToImport);

      const result = await entriesController.import(
        { entries: entriesToImport },
        mockRequest,
      );
      expect(mockEntriesService.importEntries).toHaveBeenCalledWith(
        'id',
        entriesToImport,
      );
      expect(result).toEqual(entriesToImport);
    });
  });
});
