"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ReviewController = exports.NotificationController = exports.ClassController = exports.UserProfile = exports.AuthController = void 0;
// export { default as UserController } from "./user.example.controller";
var auth_controller_1 = require("./auth.controller");
Object.defineProperty(exports, "AuthController", { enumerable: true, get: function () { return __importDefault(auth_controller_1).default; } });
var user_controller_1 = require("./user.controller");
Object.defineProperty(exports, "UserProfile", { enumerable: true, get: function () { return __importDefault(user_controller_1).default; } });
var class_controller_1 = require("./class.controller");
Object.defineProperty(exports, "ClassController", { enumerable: true, get: function () { return __importDefault(class_controller_1).default; } });
var notifications_controller_1 = require("./notifications.controller");
Object.defineProperty(exports, "NotificationController", { enumerable: true, get: function () { return __importDefault(notifications_controller_1).default; } });
var review_controller_1 = require("./review.controller");
Object.defineProperty(exports, "ReviewController", { enumerable: true, get: function () { return __importDefault(review_controller_1).default; } });
