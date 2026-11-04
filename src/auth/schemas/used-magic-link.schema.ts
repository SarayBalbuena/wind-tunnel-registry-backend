import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type UsedMagicLinkDocument = HydratedDocument<UsedMagicLink>;

// Records magic-link tokens that were already used, so each link works once.
// Documents are removed by MongoDB once the token would have expired anyway.
@Schema({ collection: 'used_magic_links' })
export class UsedMagicLink {
  @Prop({ required: true, unique: true })
  jti: string;

  @Prop({ required: true, expires: 0 })
  expiresAt: Date;
}

export const UsedMagicLinkSchema = SchemaFactory.createForClass(UsedMagicLink);
