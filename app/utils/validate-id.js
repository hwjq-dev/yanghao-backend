import mongoose from "mongoose";

export default function validateId(id) {
  try {
    return mongoose.isValidObjectId && mongoose.isValidObjectId(id);
  } catch {
    return false;
  }
}
