const mongoose = require('mongoose');

const imageSchema = new mongoose.Schema(
  {
    url:              { type: String, required: true }, // image utilisée pour la publication
    thumbUrl:         { type: String },
    alt:              { type: String },
    source:           { type: String, enum: ['unsplash', 'url'], default: 'url' },
    creditName:       { type: String }, // attribution obligatoire Unsplash
    creditUrl:        { type: String },
    downloadLocation: { type: String }, // endpoint Unsplash à déclencher à l'utilisation
  },
  { _id: false }
);

const socialPostSchema = new mongoose.Schema(
  {
    organizationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization', required: true, index: true },
    createdBy:      { type: String, required: true }, // clerkUserId
    network:        { type: String, enum: ['linkedin', 'instagram'], default: 'linkedin' },
    text:           { type: String, default: '', maxlength: 3000 }, // limite LinkedIn (Instagram : 2200, voir NETWORKS)
    image:          { type: imageSchema },
    imageOptions:   { type: [imageSchema], default: [] }, // photos proposées par l'IA
    brief:          { type: String, trim: true },
    source:         { type: String, enum: ['ai', 'manual'], default: 'manual' },
    status: {
      type: String,
      enum: ['draft', 'scheduled', 'publishing', 'published', 'failed'],
      default: 'draft',
      index: true,
    },
    scheduledAt: { type: Date, index: true },
    publishedAt: { type: Date },
    externalId:  { type: String }, // URN du post LinkedIn ou ID du média Instagram
    externalUrl: { type: String },
    error:       { type: String },
  },
  { timestamps: true }
);

module.exports = mongoose.model('SocialPost', socialPostSchema);
