import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import { ROLES } from "../constants.js";

export { ROLES };

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

const userSchema = new mongoose.Schema(
  {
    /* ── Auth fields ── */
    name: {
      type: String,
      required: [true, "Full name is required"],
      trim: true,
      minlength: [2, "Name must be at least 2 characters"],
      maxlength: [50, "Name must be under 50 characters"],
    },
    email: {
      type: String,
      required: [true, "Email address is required"],
      unique: true,
      lowercase: true,
      trim: true,
      maxlength: [254, "Email is too long"],
      validate: {
        validator: (v) => EMAIL_REGEX.test(v),
        message: "Please provide a valid email address",
      },
    },
    password: {
      type: String,
      required: [true, "Password is required"],
      minlength: [8, "Password must be at least 8 characters"],
      maxlength: [128, "Password must be under 128 characters"],
    },
    role: {
      type: String,
      enum: {
        values: ROLES,
        message: "Role must be one of: cyclist, partner, admin",
      },
      default: "cyclist",
    },
    isVerified: {
      type: Boolean,
      default: false,
    },
    isBlocked: {
      type: Boolean,
      default: false,
    },
    /* Profile image for chat/avatar (all roles) */
    profileImage: {
      type: String,
      trim: true,
      default: "",
    },

    /* ── Partner fields ── */
    shopName: {
      type: String,
      trim: true,
      maxlength: [80, "Shop name must be under 80 characters"],
    },
    shopImage: {
      type: String,
      trim: true,
      default: "",
    },
    description: {
      type: String,
      trim: true,
      maxlength: [500, "Description must be under 500 characters"],
    },
    location: {
      type: String,
      trim: true,
      maxlength: [100, "Location must be under 100 characters"],
    },
    address: {
      type: String,
      trim: true,
      maxlength: [200, "Address must be under 200 characters"],
    },
    category: {
      type: String,
      trim: true,
      maxlength: [60, "Category must be under 60 characters"],
    },
    phoneNumber: {
      type: String,
      trim: true,
      maxlength: [20, "Phone number must be under 20 characters"],
    },
    partnerAvailableBalance: {
      type: Number,
      default: 0,
      min: 0,
    },
    partnerTotalRedemptions: {
      type: Number,
      default: 0,
      min: 0,
    },
    /** Bank details for payout destination (Requirement v). Nested object: all fields optional until set. */
    bankDetails: {
      bankName: {
        type: String,
        trim: true,
        maxlength: [100, "Bank name must be under 100 characters"],
        default: "",
      },
      branchName: {
        type: String,
        trim: true,
        maxlength: [100, "Branch name must be under 100 characters"],
        default: "",
      },
      accountNo: {
        type: String,
        trim: true,
        maxlength: [40, "Account number must be under 40 characters"],
        default: "",
      },
      accountHolderName: {
        type: String,
        trim: true,
        maxlength: [100, "Account holder name must be under 100 characters"],
        default: "",
      },
    },

    /* ── Cyclist stats fields ── */
    tokens: {
      type: Number,
      default: 0,
      min: 0,
    },
    totalDistance: {
      type: Number,
      default: 0, // in kilometres
      min: 0,
    },
    co2Saved: {
      type: Number,
      default: 0, // in kg
      min: 0,
    },
    totalRides: {
      type: Number,
      default: 0,
      min: 0,
    },
    safetyScore: {
      type: Number,
      default: 100, // percentage
      min: 0,
      max: 100,
    },
  },
  {
    timestamps: true,
    collection: "users",
  },
);

/* ── Password hashing ── */
userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();
  try {
    const salt = await bcrypt.genSalt(12);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (err) {
    next(err);
  }
});

userSchema.methods.matchPassword = async function (enteredPassword) {
  return bcrypt.compare(enteredPassword, this.password);
};

const User = mongoose.model("User", userSchema);

export default User;
