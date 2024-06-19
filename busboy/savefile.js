const fs = require("fs");
const path = require("path");
const mime = require("mime-types");
const uniqid = require("uniqid");

exports.saveFilesToFolder = async (files, folderPath) => {
  try {
    if (!fs.existsSync(folderPath)) {
      fs.mkdirSync(folderPath, { recursive: true });
    }
    const savedFiles = {};

    for (const customName in files) {
      const file = files[customName];
      if (file && file.content) {
        const mimeType = mime.lookup(file.filename);

        if (!["image/png", "image/jpeg"].includes(mimeType)) {
          throw new Error(
            `File ${file.filename} is not a valid image. Only PNG and JPEG formats are allowed.`
          );
        }

        const extension = mime.extension(mimeType);
        const randomFilename = `${uniqid()}.${extension}`;
        const filePath = path.join(folderPath, randomFilename);
        fs.writeFileSync(filePath, file.content);

        savedFiles[customName] = randomFilename;
      } else {
        throw new Error(`File data for ${customName} is invalid.`);
      }
    }

    console.log("All files saved successfully.");
    return savedFiles;
  } catch (error) {
    console.error("Error saving files:", error);
    throw new Error(`Error saving files: ${error.message}`);
  }
};

exports.cleanupFiles = async (folderPath) => {
  try {
    const files = await fs.promises.readdir(folderPath);
    for (const file of files) {
      const filePath = path.join(folderPath, file);
      await fs.promises.unlink(filePath);
    }
    await fs.promises.rmdir(folderPath);
    console.log("Files and folder removed successfully.");
  } catch (error) {
    console.error("Error cleaning up files:", error);
  }
};
