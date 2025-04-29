import axios from "axios";

export const chatwithMemory = async (
  query: string,
  user: any,
  userId: string
) => {
  const res = await axios.post("http://localhost:5000/chat", {
    query,
    user,
    userId,
  });

  return res.data;
};
