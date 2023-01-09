const dotenv = require('dotenv').config()
const express = require('express')
const { TwitterApi } = require('twitter-api-v2');
const app = express();


const twitter = new TwitterApi(process.env.BEARER_TOKEN);


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
            console.log(response);
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

        return res.json({ count, tweet: tweet, thread: tweets.reverse() })
    } catch (error) {
        console.log(error.message);
        return res.json(error.message);
    }
})


app.listen(3000, () => {
    console.log(`Server is up and running!`);
})

