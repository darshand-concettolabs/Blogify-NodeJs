const mongoose = require("mongoose");
const { createHmac, randomBytes } = require("crypto");
const { createTokenForUser } = require("../services/authentication");

const userSchema = new mongoose.Schema(
  {
    fullName: {
      type: String,
      required: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
    },
    salt: {
      type: String,
    },
    password: {
      type: String,
      required: true,
    },
    profileImgUrl: {
      type: String,
      default: "./public/images/useravatar.jpg",
    },
    role: {
      type: String,
      enum: ["USER", "ADMIN"],
      default: "USER",
    },
  },
  { timestamps: true }
);

userSchema.pre("save", function (next) {
  const user = this;
  if (!user.isModified("password")) return;

  const salt = randomBytes(16).toString();
  const hashedPassword = createHmac("sha256", salt)
    .update(user.password)
    .digest("hex");

  this.salt = salt;
  this.password = hashedPassword;

  next();
});

userSchema.static(
  "findUserByPasswordAndGenerateToken",
  async function (email, password) {
    const user = await this.findOne({ email });
    if (!user) throw new Error("User not found!");

    const salt = user.salt;
    const hashedUserPassword = user.password;

    const userProvidedPassword = createHmac("sha256", salt)
      .update(password)
      .digest("hex");

    if (hashedUserPassword !== userProvidedPassword)
      throw new Error("Invalid password!");

    const token = createTokenForUser(user);
    return token;
  }
);

const User = mongoose.model("user", userSchema);

module.exports = User;
