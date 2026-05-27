/**
 * Facebook Graph API Integration
 * Handles authentication, page connection, and API calls
 */

import axios from "axios";

const FB_GRAPH_API_VERSION = "v19.0";
const FB_GRAPH_URL = `https://graph.facebook.com/${FB_GRAPH_API_VERSION}`;

export interface FacebookPageInfo {
  id: string;
  name: string;
  picture?: {
    data: {
      height: number;
      width: number;
      is_silhouette: boolean;
      url: string;
    };
  };
  access_token?: string;
}

export interface FacebookMessage {
  id: string;
  message: string;
  created_time: string;
  from: {
    id: string;
    name: string;
    email?: string;
  };
}

export interface FacebookConversation {
  id: string;
  messages: FacebookMessage[];
}

/**
 * Get Facebook page information using page access token
 */
export async function getPageInfo(pageAccessToken: string): Promise<FacebookPageInfo> {
  try {
    const response = await axios.get(`${FB_GRAPH_URL}/me`, {
      params: {
        fields: "id,name,picture.type(large)",
        access_token: pageAccessToken,
      },
    });

    return response.data;
  } catch (error) {
    console.error("Error fetching page info:", error);
    throw new Error("Failed to fetch Facebook page information");
  }
}

/**
 * Get incoming messages for a page
 */
export async function getPageMessages(
  pageAccessToken: string,
  limit: number = 25
): Promise<FacebookConversation[]> {
  try {
    const response = await axios.get(`${FB_GRAPH_URL}/me/conversations`, {
      params: {
        fields: "id,messages.limit(10){id,message,created_time,from}",
        limit,
        access_token: pageAccessToken,
      },
    });

    return response.data.data || [];
  } catch (error) {
    console.error("Error fetching messages:", error);
    throw new Error("Failed to fetch page messages");
  }
}

/**
 * Send a message as the page to a user
 */
export async function sendPageMessage(
  pageAccessToken: string,
  recipientId: string,
  message: string
): Promise<{ message_id: string }> {
  try {
    const response = await axios.post(`${FB_GRAPH_URL}/me/messages`, {
      recipient: { id: recipientId },
      message: { text: message },
      access_token: pageAccessToken,
    });

    return response.data;
  } catch (error) {
    console.error("Error sending message:", error);
    throw new Error("Failed to send message");
  }
}

/**
 * Publish a post to the page feed
 */
export async function publishPagePost(
  pageAccessToken: string,
  message: string,
  imageUrl?: string
): Promise<{ id: string; post_id: string }> {
  try {
    const payload: any = {
      message,
      access_token: pageAccessToken,
    };

    if (imageUrl) {
      payload.picture = imageUrl;
      payload.link = imageUrl;
    }

    const response = await axios.post(`${FB_GRAPH_URL}/me/feed`, payload);

    return response.data;
  } catch (error) {
    console.error("Error publishing post:", error);
    throw new Error("Failed to publish post");
  }
}

/**
 * Get page insights (analytics)
 */
export async function getPageInsights(
  pageAccessToken: string,
  metric: string = "page_fans"
): Promise<any> {
  try {
    const response = await axios.get(`${FB_GRAPH_URL}/me/insights`, {
      params: {
        metric,
        access_token: pageAccessToken,
      },
    });

    return response.data.data || [];
  } catch (error) {
    console.error("Error fetching insights:", error);
    throw new Error("Failed to fetch page insights");
  }
}

/**
 * Validate page access token
 */
export async function validatePageToken(pageAccessToken: string): Promise<boolean> {
  try {
    const response = await axios.get(`${FB_GRAPH_URL}/debug_token`, {
      params: {
        input_token: pageAccessToken,
        access_token: pageAccessToken,
      },
    });

    const data = response.data.data;
    return data.is_valid && data.app_id;
  } catch (error) {
    console.error("Error validating token:", error);
    return false;
  }
}

/**
 * Get user's pages list (requires user access token)
 */
export async function getUserPages(userAccessToken: string): Promise<FacebookPageInfo[]> {
  try {
    const response = await axios.get(`${FB_GRAPH_URL}/me/accounts`, {
      params: {
        fields: "id,name,picture.type(large),access_token",
        access_token: userAccessToken,
      },
    });

    return response.data.data || [];
  } catch (error) {
    console.error("Error fetching user pages:", error);
    throw new Error("Failed to fetch user pages");
  }
}
