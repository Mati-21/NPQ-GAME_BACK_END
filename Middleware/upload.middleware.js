import multer from "multer";

const storage = multer.memoryStorage(); // store in memory buffer
console.log("Multer");
const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
});
console.log("Multer 55555555555555555555");
export default upload;
