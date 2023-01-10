const dotenv = require('dotenv').config()
const express = require('express')
const { TwitterApi } = require('twitter-api-v2');
const app = express();
const { Client } = require('@notionhq/client');


const twitter = new TwitterApi(process.env.BEARER_TOKEN);
const notion = new Client({ auth: process.env.NOTION_SECRET });

// function timer(ms) { return new Promise(res => setTimeout(res, ms)); }


app.get('/search', async (req, res, next) => {
    try {
        let tweets = [];
        let next_token;
        let count = 0;
        let tweet;
        if (req.query.tweetId) {
            tweet = await twitter.v2.singleTweet(req.query.tweetId, { 'media.fields': ['attachments'], expansions: ['attachments.media_keys', 'author_id'], 'media.fields': ['url', 'height'] });
        }
        else {
            return res.json({ success: false })
        }

        const user = tweet.data.author_id;
        const query = `conversation_id:${req.query.tweetId} from:${user} to:${user}`
        do {
            const response = await twitter.v2.search(query, { next_token, 'media.fields': ['attachments'], expansions: ['attachments.media_keys'], 'media.fields': ['url', 'height'] });
            if (response._realData.data) {
                tweets = [...tweets, ...response._realData.data];
                count += tweets.length;
            }

            if (response._realData.meta.next_token) {
                next_token = response._realData.meta.next_token;
            }
            else {
                next_token = null;
            }
            // await timer(1000);
        } while (next_token);

        const tweetData = { count, tweet, thread: tweets.reverse() };
        console.log(tweetData);
        try {
            const childBlocks = [];
            tweetData.thread.forEach((tweet) => {
                childBlocks.push({
                    "object": "block",
                    "paragraph": {
                        "rich_text": [
                            {
                                "text": {
                                    "content": tweet.text
                                }
                            }
                        ]
                    }
                })
            })
            let response;
            if (tweetData.tweet.includes.media) {
                response = await notion.pages.create({
                    "cover": {
                        "type": "external",
                        "external": {
                            "url": tweetData.tweet.includes.media[0].url
                        }
                    },
                    "parent": {
                        "type": "database_id",
                        "database_id": "2d38238ecd18471cae50f502867cc4b1"
                    },
                    "properties": {
                        "title": {
                            "title": [
                                {
                                    "text": {
                                        "content": tweetData.tweet.data.text
                                    }
                                }
                            ]
                        }
                    },
                    'children': childBlocks
                })
            } else {
                response = await notion.pages.create({
                    "parent": {
                        "type": "database_id",
                        "database_id": "2d38238ecd18471cae50f502867cc4b1"
                    },
                    "properties": {
                        "title": {
                            "title": [
                                {
                                    "text": {
                                        "content": tweetData.tweet.data.text
                                    }
                                }
                            ]
                        }
                    },
                    'children': childBlocks
                })
            }

            if (response.id) {
                return res.json({ success: true, message: "Page Created!", pageId: response.id, response })
            }
        } catch (error) {
            console.log(error.message);
            return res.json({ success: false, message: error.message })
        }


    } catch (error) {
        console.log(error.message);
        return res.json(error.message);
    }
})
app.listen(3000, () => {
    console.log(`Server is up and running!`);
})

