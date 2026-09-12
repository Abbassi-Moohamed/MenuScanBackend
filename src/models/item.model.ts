import { model, Schema, type InferSchemaType, type Types } from "mongoose";

const itemSchema = new Schema(
  {
    name: {
      type: String,
      required: [true, "Item name is required."],
      trim: true,
      maxlength: [120, "Item name must be at most 120 characters."],
    },
    description: {
      type: String,
      trim: true,
      maxlength: [500, "Item description must be at most 500 characters."],
      default: null,
    },
    price: {
      type: Number,
      required: [true, "Item price is required."],
      min: [0, "Item price must be zero or greater."],
    },
    image: {
      type: String,
      trim: true,
      default: null,
    },
    itemCategoryId: {
      type: Schema.Types.ObjectId,
      ref: "ItemCategory",
      required: [true, "An item must belong to a category."],
    },
  },
  {
    timestamps: true,
    versionKey: false,
    collection: "items",
  },
);

itemSchema.index({ itemCategoryId: 1 });

export type Item = InferSchemaType<typeof itemSchema> & {
  _id: Types.ObjectId;
};

export const ItemModel = model<Item>("Item", itemSchema);