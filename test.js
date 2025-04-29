const crypto = require("crypto");

function createSignature(requestBody, privateKey) {
  const jsonPayload = JSON.stringify(requestBody, null, 0).replace(/\n/g, "");
  // Generate the signature using the SHA-256 algorithm and the private key
  const signature = crypto
    .createHmac("sha256", privateKey)
    .update(jsonPayload)
    .digest("hex");

  console.log("signature: ", signature);
  return signature;
}

const requestBody = {
    "input": "what is my loan amount?"
};
const PRIVATE_KEY =
  "96001703ad5a584d8dc1ef34e7ed56bcb5a8766de7f472d7ee0d39e02800edbf";
createSignature(requestBody, PRIVATE_KEY);
