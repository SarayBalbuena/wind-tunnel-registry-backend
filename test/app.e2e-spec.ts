import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { getConnectionToken, getModelToken } from '@nestjs/mongoose';
import { Entry } from '../src/entries/schemas/entry.schema';
import { User } from '../src/users/schemas/user.schema';
import { UsedMagicLink } from '../src/auth/schemas/used-magic-link.schema';
import { vi } from 'vitest';

describe('AppController (e2e)', () => {
  let app: INestApplication<App>;

  const mockModel = {
    find: vi.fn().mockReturnThis(),
    exec: vi.fn(),
    create: vi.fn(),
    collection: { indexes: vi.fn().mockResolvedValue([]) },
  };

  const mockConnection = {
    close: vi.fn(),
    model: vi.fn(),
  };

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(getConnectionToken())
      .useValue(mockConnection)
      .overrideProvider(getModelToken(Entry.name))
      .useValue(mockModel)
      .overrideProvider(getModelToken(User.name))
      .useValue(mockModel)
      .overrideProvider(getModelToken(UsedMagicLink.name))
      .useValue(mockModel)
      .compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('/ (GET)', async () => {
    await request(app.getHttpServer())
      .get('/')
      .expect(301)
      .expect('Location', '/docs');
  });
});
