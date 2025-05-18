"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
Object.defineProperty(exports, "__esModule", { value: true });
var fs_1 = require("fs");
var path_1 = require("path");
var csv_parser_1 = require("csv-parser");
var child_process_1 = require("child_process"); // To execute AppleScript
var testMode = true; // ✅ Toggle this to true to send the test message
var testPhoneNumber = '760-833-6334'; // Test phone number
var testAddress = '73120 Santa Rosa Way Apt A Palm Desert CA 92260'; // Test address
var csvPath = path_1.default.join(process.cwd(), 'src', 'scripts', 'data', 'Filtered_Coachella___Morongo_Expired_Contacts.csv');
// A set to keep track of the contacts we have already sent messages to (for test mode)
var sentLogPath = path_1.default.join(process.cwd(), 'src', 'scripts', 'data', 'sent_log.csv');
var sentNumbers = new Set();
if (!testMode && fs_1.default.existsSync(sentLogPath)) {
    var sentData = fs_1.default.readFileSync(sentLogPath, 'utf-8').split('\n');
    for (var _i = 0, sentData_1 = sentData; _i < sentData_1.length; _i++) {
        var line = sentData_1[_i];
        var number = line.trim();
        if (number)
            sentNumbers.add(number);
    }
}
var appendLog = fs_1.default.createWriteStream(sentLogPath, { flags: 'a' });
var allRecipients = [];
fs_1.default.createReadStream(csvPath)
    .pipe((0, csv_parser_1.default)())
    .on('data', function (row) {
    var _a, _b, _c;
    var firstName = (_a = row['first_name']) === null || _a === void 0 ? void 0 : _a.trim();
    var phone = (_b = row['phone']) === null || _b === void 0 ? void 0 : _b.trim();
    var address = (_c = row['address']) === null || _c === void 0 ? void 0 : _c.trim();
    if (!firstName || !phone || !address)
        return; // Skip if no phone number or address
    if (!testMode && sentNumbers.has(phone))
        return; // Skip if number already processed
    allRecipients.push(row);
})
    .on('end', function () { return __awaiter(void 0, void 0, void 0, function () {
    var message, appleScript, _loop_1, _i, allRecipients_1, contact;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                if (testMode) {
                    console.log("\uD83E\uDDEA TEST MODE ENABLED \u2014 Sending to test number: ".concat(testPhoneNumber));
                    message = "Hey, my name's Joseph Sardella with eXp Realty. I wanted to know if your property at ".concat(testAddress, " was sold yet?");
                    appleScript = "\n      tell application \"Messages\"\n          set targetService to 1st service whose service type = iMessage\n          set targetBuddy to \"".concat(testPhoneNumber, "\"\n          send \"").concat(message, "\" to buddy targetBuddy of targetService\n      end tell\n      ");
                    try {
                        (0, child_process_1.exec)("osascript -e '".concat(appleScript, "'"), function (err, stdout, stderr) {
                            if (err) {
                                console.error("\u274C Failed to send test message:", stderr);
                            }
                            else {
                                console.log("\u2705 Test message sent to ".concat(testPhoneNumber, ": ").concat(stdout));
                            }
                        });
                    }
                    catch (err) {
                        console.error("\u274C Failed to send test message:", err);
                    }
                    return [2 /*return*/];
                }
                _loop_1 = function (contact) {
                    var firstName, phone, address, message, appleScript, err_1;
                    return __generator(this, function (_b) {
                        switch (_b.label) {
                            case 0:
                                firstName = contact.first_name;
                                phone = contact.phone;
                                address = contact.address;
                                message = "Hey, my name's Joseph Sardella with eXp Realty. I wanted to know if your property at ".concat(address, " was sold yet?");
                                appleScript = "\n      tell application \"Messages\"\n          set targetService to 1st service whose service type = iMessage\n          set targetBuddy to \"".concat(phone, "\"\n          send \"").concat(message, "\" to buddy targetBuddy of targetService\n      end tell\n      ");
                                _b.label = 1;
                            case 1:
                                _b.trys.push([1, 3, , 4]);
                                (0, child_process_1.exec)("osascript -e '".concat(appleScript, "'"), function (err, stdout, stderr) {
                                    if (err) {
                                        console.error("\u274C Failed to send to ".concat(phone, ":"), stderr);
                                    }
                                    else {
                                        console.log("\u2705 Sent to ".concat(firstName, " <").concat(phone, ">: ").concat(stdout));
                                        appendLog.write("".concat(phone, "\n"));
                                    }
                                });
                                // Add delay between sending messages (e.g., 5 seconds) to avoid spamming too fast
                                return [4 /*yield*/, new Promise(function (resolve) { return setTimeout(resolve, 5000); })];
                            case 2:
                                // Add delay between sending messages (e.g., 5 seconds) to avoid spamming too fast
                                _b.sent();
                                return [3 /*break*/, 4];
                            case 3:
                                err_1 = _b.sent();
                                console.error("\u274C Failed to send to ".concat(phone, ":"), err_1);
                                return [3 /*break*/, 4];
                            case 4: return [2 /*return*/];
                        }
                    });
                };
                _i = 0, allRecipients_1 = allRecipients;
                _a.label = 1;
            case 1:
                if (!(_i < allRecipients_1.length)) return [3 /*break*/, 4];
                contact = allRecipients_1[_i];
                return [5 /*yield**/, _loop_1(contact)];
            case 2:
                _a.sent();
                _a.label = 3;
            case 3:
                _i++;
                return [3 /*break*/, 1];
            case 4:
                appendLog.end();
                console.log('📤 All messages processed.');
                return [2 /*return*/];
        }
    });
}); });
