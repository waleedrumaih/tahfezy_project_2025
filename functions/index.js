/**
 * Import function triggers from their respective submodules:
 *
 * const {onCall} = require("firebase-functions/v2/https");
 * const {onDocumentWritten} = require("firebase-functions/v2/firestore");
 *
 * See a full list of supported triggers at https://firebase.google.com/docs/functions
 */

const {onCall} = require("firebase-functions/v2/https");
const admin = require("firebase-admin");

// Create and deploy your first functions
// https://firebase.google.com/docs/functions/get-started

// exports.helloWorld = onRequest((request, response) => {
//   logger.info("Hello logs!", {structuredData: true});
//   response.send("Hello from Firebase!");
// });

admin.initializeApp();

exports.setAdminRole = onCall(async (request) => {
  // Get data from the request
  const {email} = request.data;
  const {admin: isAdmin} = request.auth.token;

  // Check if the caller is an admin
  if (!isAdmin) {
    throw new Error("ليس لديك صلاحية لتعيين المشرفين");
  }

  try {
    // Get user by email
    const user = await admin.auth().getUserByEmail(email);

    // Set admin custom claim
    await admin.auth().setCustomUserClaims(user.uid, {
      admin: true,
    });

    return {
      result: `تم تعيين ${email} كمشرف بنجاح`,
    };
  } catch (error) {
    console.error("Error:", error);
    throw new Error("حدث خطأ في تعيين المشرف");
  }
});

// Function to get the first admin (use this once to set up your first admin)
exports.makeFirstAdmin = onCall(async (request) => {
  const {email, secretKey} = request.data;

  // Check secret key (set this to something secure)
  if (secretKey !== "your-secret-key-here") {
    throw new Error("مفتاح غير صحيح");
  }

  try {
    const user = await admin.auth().getUserByEmail(email);
    await admin.auth().setCustomUserClaims(user.uid, {
      admin: true,
    });

    return {
      result: `تم تعيين ${email} كأول مشرف`,
    };
  } catch (error) {
    console.error("Error:", error);
    throw new Error("حدث خطأ في تعيين المشرف الأول");
  }
});
