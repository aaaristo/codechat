import React, { useState, useEffect, useRef } from "react";
import styled from "styled-components";
import axios from "axios";
import Markdown from "react-markdown";

const Container = styled.div`
  display: flex;
  height: 100vh;
`;

const ChatContainer = styled.div`
  display: flex;
  flex-direction: column;
  max-width: 600px;
  height: 90vh;
  margin: 0 auto;
  padding: 20px;
  border: 1px solid #ddd;
  border-radius: 8px;
  box-shadow: 0 0 10px rgba(0, 0, 0, 0.1);
  flex: 1;
`;

const ChatLog = styled.div`
  flex: 1;
  overflow-y: auto;
  margin-bottom: 10px;
`;

const ChatMessage = styled.div`
  margin-bottom: 10px;
`;

const ChatImage = styled.img`
  max-width: 100%;
  height: auto;
`;

const MessageInput = styled.textarea`
  width: calc(100% - 22px);
  height: 100px;
  padding: 10px;
  margin-bottom: 10px;
  border-radius: 5px;
  border: 1px solid #ccc;
  resize: none;
  font-family: inherit;
`;

const FileInput = styled.input`
  margin-bottom: 10px;
`;

const SendButton = styled.button`
  padding: 10px 20px;
  background-color: #007bff;
  color: white;
  border: none;
  border-radius: 5px;
  cursor: pointer;
  &:disabled {
    background-color: #ccc;
    cursor: not-allowed;
  }
`;

const IframeContainer = styled.div`
  flex: 1;
  border-left: 1px solid #ddd;
`;

const Iframe = styled.iframe`
  width: 100%;
  height: 100%;
  border: none;
`;

const ImagePreviewContainer = styled.div`
  position: relative;
  display: inline-block;
  margin-bottom: 10px;
`;

const ImagePreview = styled.img`
  width: 100px;
  height: 100px;
  object-fit: cover;
  border: 1px solid #ddd;
  border-radius: 5px;
`;

const RemoveButton = styled.button`
  position: absolute;
  top: 0;
  right: 0;
  background: red;
  color: white;
  border: none;
  border-radius: 50%;
  width: 20px;
  height: 20px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
  line-height: 14px;
`;

function App() {
  const [message, setMessage] = useState("");
  const [image, setImage] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [chatLog, setChatLog] = useState([]);
  const [loading, setLoading] = useState(false);
  const chatLogRef = useRef(null);
  const apiUrl = "http://localhost:3000/chat-with-openai";

  useEffect(() => {
    if (chatLogRef.current) {
      chatLogRef.current.scrollTop = chatLogRef.current.scrollHeight;
    }
  }, [chatLog]);

  const handleSend = async () => {
    if (!message.trim()) return;

    setLoading(true);

    const image_url = await toDataURI(image);

    const requestBody = {
      messages: [
        {
          type: "text",
          text: message,
        },
        image
          ? {
              type: "image_url",
              image_url: {
                url: image_url,
              },
            }
          : null,
      ].filter((x) => !!x),
    };

    try {
      const response = await axios.post(apiUrl, requestBody);
      const aiMessage = response.data.message;
      setChatLog(
        [
          ...chatLog,
          { user: "You", message },
          image ? { user: "You", image_url } : null,
          { user: "AI", message: aiMessage },
        ].filter((x) => !!x)
      );
      setMessage(""); // Clear the message field after sending
      setImage(null); // Clear the image after sending
      setImagePreview(null); // Clear the image preview after sending
    } catch (error) {
      console.error("Error chatting with AI", error);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (event) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault(); // Prevent new line in textarea
      handleSend();
    }
  };

  const toDataURI = (file) =>
    new Promise((resolve, reject) => {
      if (!file) return resolve(null);

      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result);
      reader.onerror = (error) => reject(error);
    });

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    setImage(file);

    const reader = new FileReader();
    reader.onloadend = () => {
      setImagePreview(reader.result);
    };
    reader.readAsDataURL(file);
    e.target.value = null; // Clear the file input after selecting
  };

  const handleRemoveImage = () => {
    setImage(null);
    setImagePreview(null);
  };

  return (
    <Container>
      <ChatContainer>
        <ChatLog ref={chatLogRef}>
          {chatLog.map((entry, index) => (
            <ChatMessage key={index}>
              <strong>{entry.user}:</strong>{" "}
              {entry.image_url ? (
                <ChatImage src={entry.image_url} alt="User uploaded" />
              ) : (
                <Markdown>{entry.message}</Markdown>
              )}
            </ChatMessage>
          ))}
        </ChatLog>
        <MessageInput
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Type your message here..."
          onKeyPress={handleKeyPress}
        />
        <FileInput type="file" accept="image/*" onChange={handleFileChange} />
        {imagePreview && (
          <ImagePreviewContainer>
            <ImagePreview src={imagePreview} alt="Image preview" />
            <RemoveButton onClick={handleRemoveImage}>X</RemoveButton>
          </ImagePreviewContainer>
        )}
        <SendButton onClick={handleSend} disabled={loading}>
          {loading ? "Sending..." : "Send"}
        </SendButton>
      </ChatContainer>
      <IframeContainer>
        <Iframe src="http://localhost:4000" />
      </IframeContainer>
    </Container>
  );
}

export default App;
