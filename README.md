# scrape_geopeitus
Testing out webtask.io by scraping geopeitus.ee. This sends a sms to me each time a new geocache is published.

## Required secrets:

To make the webtask work, you need the following secrets registered:
* `TWILIO_SMS_AUTH_SID`, `TWILIO_SMS_AUTH_TOKEN` - Twilio project authentication id and token
* `TWILIO_NUMBER` - (reserved) phone number that twilio will send the sms from
* `TARGET_PHONE_NUMBER` - phone number sms should be sent to
