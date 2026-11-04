import { Test } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { UsersService } from './users.service';
import { User } from './schemas/user.schema';

describe('UsersService', () => {
  let service: UsersService;
  const collection = {
    indexes: vi.fn(),
    dropIndex: vi.fn(),
    createIndex: vi.fn(),
  };

  beforeEach(async () => {
    vi.clearAllMocks();
    const module = await Test.createTestingModule({
      providers: [
        UsersService,
        { provide: getModelToken(User.name), useValue: { collection } },
      ],
    }).compile();
    service = module.get(UsersService);
  });

  describe('onModuleInit', () => {
    it('replaces a non-sparse googleId index with a sparse one', async () => {
      collection.indexes.mockResolvedValue([
        { name: '_id_' },
        { name: 'googleId_1', unique: true },
      ]);

      await service.onModuleInit();

      expect(collection.dropIndex).toHaveBeenCalledWith('googleId_1');
      expect(collection.createIndex).toHaveBeenCalledWith(
        { googleId: 1 },
        { name: 'googleId_1', unique: true, sparse: true },
      );
    });

    it('does nothing when the index is already sparse', async () => {
      collection.indexes.mockResolvedValue([
        { name: 'googleId_1', unique: true, sparse: true },
      ]);

      await service.onModuleInit();

      expect(collection.dropIndex).not.toHaveBeenCalled();
      expect(collection.createIndex).not.toHaveBeenCalled();
    });

    it('does not crash startup when the migration fails', async () => {
      collection.indexes.mockRejectedValue(new Error('no connection'));

      await expect(service.onModuleInit()).resolves.toBeUndefined();
    });
  });
});
