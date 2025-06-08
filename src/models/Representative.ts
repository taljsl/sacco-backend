// src/models/Representative.ts
import mongoose, { Schema, Document, Types } from "mongoose";

export interface IRepresentative extends Document {
  _id: Types.ObjectId;
  name: string;
  phone: string;
  email: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const RepresentativeSchema: Schema = new Schema<IRepresentative>({
    name: {
        type: String,
        required: true,
        trim: true,
    },
    phone: {
        type: String,
        required: true,
        trim: true,
    },
    email: {
        type: String,
        required: true,
        unique: true,
        lowercase: true,
    },
    isActive: {
        type: Boolean,
        default: true,
    },
}, {
    timestamps: true,
});

export default mongoose.model<IRepresentative>("Representative", RepresentativeSchema)