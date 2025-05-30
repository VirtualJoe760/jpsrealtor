import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IRoom extends Document {
  listingId: string;
  roomId: string;
  fields: Record<string, any>; // Stores arbitrary room info as key/value pairs
}

const RoomSchema: Schema<IRoom> = new Schema({
  listingId: { type: String, required: true, index: true },
  roomId: { type: String, required: true, unique: true },
  fields: Schema.Types.Mixed, // flexible to store array or object
});

const Room: Model<IRoom> = mongoose.models.Room || mongoose.model<IRoom>('Room', RoomSchema);

export default Room;
