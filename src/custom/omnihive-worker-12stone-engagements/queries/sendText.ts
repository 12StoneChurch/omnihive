/// <reference path="../../../types/globals.omnihive.d.ts" />

interface SendSmsArgs {
    body: string;
    from: string; // shortcode or other twilio phone number
    to: string; // contact phone
}

export const sendText = async (data: SendSmsArgs, graphUrl: string) => {
  try {
      const textQuery = `
      query {
        SendSms(customArgs: {
          body: "${data.body}"
          from: "${data.from}"
          to: "${data.to}"
        })
      }
    `;

      // const dataUrl = global.omnihive.registeredUrls;
      return await global.omnihive.serverClient.graphClient(graphUrl, textQuery);
  } catch (err) {
      throw Error(err);
  }
};
