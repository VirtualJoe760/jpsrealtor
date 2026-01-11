import mongoose, { Schema, Document as MongooseDocument, Model } from 'mongoose';

export interface IDocument extends MongooseDocument {
  listingId: string;
  documentId: string;
  name?: string;
  uri?: string;
}

const DocumentSchema: Schema<IDocument> = new Schema({
  listingId: { type: String, required: true, index: true },
  documentId: { type: String, required: true, unique: true },
  name: String,
  uri: String,
});

export default (mongoose.models.Document ||
  mongoose.model<IDocument>('Document', DocumentSchema)) as Model<IDocument>;
