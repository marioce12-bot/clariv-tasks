const required = (name) => process.env[name] || "";

const aiConfig = {
  apiKey: required("AI_API_KEY"),
  baseUrl: required("AI_BASE_URL"),
  models: {
    text: required("AI_TEXT_MODEL"),
    image: required("AI_IMAGE_MODEL"),
    video: required("AI_VIDEO_MODEL")
  }
};

module.exports = { aiConfig };
