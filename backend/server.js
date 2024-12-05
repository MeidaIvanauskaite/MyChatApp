const express = require('express');
const WebSocket = require('ws');
const amqp = require('amqplib/callback_api');
const promClient = require('prom-client');
const app = express();

// WebSocket server setup
const wss = new WebSocket.Server({ noServer: true });

// Track connected users
let users = [];

// Prometheus Metrics
const collectDefaultMetrics = promClient.collectDefaultMetrics;
collectDefaultMetrics();

// Expose metrics for Prometheus to scrape
app.get('/metrics', async (req, res) => {
  res.set('Content-Type', promClient.register.contentType);
  res.end(await promClient.register.metrics());  // Ensure metrics are resolved
});

// RabbitMQ setup
const rabbitmqUrl = 'amqp://message-queue';  // Use the RabbitMQ service name defined in Docker Compose

amqp.connect(rabbitmqUrl, (error, connection) => {
  if (error) {
    console.error("Error connecting to RabbitMQ:", error);
    return;
  }

  connection.createChannel((error2, channel) => {
    if (error2) {
      console.error("Error creating channel:", error2);
      return;
    }

    const queue = 'chatQueue';
    channel.assertQueue(queue, { durable: false });

    // Send messages to the queue
    const sendToQueue = (msg) => {
      channel.sendToQueue(queue, Buffer.from(msg));  // Send message to RabbitMQ queue
      console.log("Message sent to queue:", msg);
    };

    // WebSocket connection handling
    wss.on('connection', (ws) => {
      console.log('A user connected');

      // Handle incoming WebSocket messages
      ws.on('message', async (message) => {
        const data = JSON.parse(message);

        if (data.type === 'setUsername') {
          // Save the username when the user sets it
          users.push({ username: data.username, ws });
          broadcastUsers();
          broadcastMessage('system', `${data.username} has joined the channel`);
        } else if (data.type === 'message') {
          // Broadcast message to all clients
          broadcastMessage(data.username, data.message);

          // Send the message to RabbitMQ for background processing (like notifications)
          sendToQueue(data.message);
        }
      });

      // Handle WebSocket close (user disconnect)
      ws.on('close', () => {
        const user = users.find((user) => user.ws === ws);
        if (user) {
          users = users.filter((user) => user.ws !== ws);
          broadcastUsers();
          broadcastMessage('system', `${user.username} has left the channel`);
        }
      });
    });

    // Function to broadcast messages to all connected clients
    const broadcastUsers = () => {
      const userNames = users.map((user) => user.username);
      users.forEach((user) => {
        user.ws.send(JSON.stringify({ type: 'userList', users: userNames }));
      });
    };

    // Function to broadcast messages to all connected clients
    const broadcastMessage = (username, message) => {
      const isJoinMessage = message.includes('has joined the channel');
      const isLeaveMessage = message.includes('has left the channel');

      // Only set isSystemMessage for join/leave messages
      users.forEach((user) => {
        user.ws.send(JSON.stringify({
          type: 'message',
          username,
          message,
          isSystemMessage: isJoinMessage || isLeaveMessage,  // Only true for join/leave
          isJoinMessage: isJoinMessage,
          isLeaveMessage: isLeaveMessage,
        }));
      });
    };


    // Upgrade HTTP requests to WebSocket
    app.server = app.listen(5000, () => {
      console.log('Server listening on port 5000');
    });

    app.server.on('upgrade', (request, socket, head) => {
      wss.handleUpgrade(request, socket, head, (ws) => {
        wss.emit('connection', ws, request);
      });
    });

  });
});

// Example MongoDB query route
app.get('/messages', async (req, res) => {
  try {
    const messages = await Message.find();  // MongoDB query to find messages
    res.json(messages);  // Send the messages as JSON
  } catch (error) {
    res.status(500).send('Server Error');
  }
});
