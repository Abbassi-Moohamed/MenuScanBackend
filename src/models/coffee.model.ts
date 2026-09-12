import { model, Schema, type InferSchemaType, type Types } from "mongoose";

export const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
export const SLUG_MESSAGE =
  "Slug must be lowercase, start and end with a letter or digit, and may only contain dashes between segments (e.g. cafe-el-manzah).";

const coffeeSchema = new Schema(
  {
    name: {
      type: String,
      required: [true, "Coffee name is required."],
      trim: true,
      maxlength: [120, "Coffee name must be at most 120 characters."],
    },
    slug: {
      type: String,
      required: [true, "Coffee slug is required."],
      trim: true,
      lowercase: true,
      unique: true,
      maxlength: [80, "Coffee slug must be at most 80 characters."],
      match: [SLUG_PATTERN, SLUG_MESSAGE],
    },
    logo: {
      type: String,
      required: [true, "Coffee logo URL is required."],
      trim: true,
    },
  },
  {
    timestamps: true,
    versionKey: false,
    collection: "coffees",
  },
);

coffeeSchema.virtual("categories", {
  ref: "ItemCategory",
  localField: "_id",
  foreignField: "coffeeId",
});

export type Coffee = InferSchemaType<typeof coffeeSchema> & {
  _id: Types.ObjectId;
};

export const CoffeeModel = model<Coffee>("Coffee", coffeeSchema);