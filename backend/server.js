const express = require('express')
const app = express()
const BluebirdPromise = require('bluebird')
const AWS = require('aws-sdk')
const bodyParser = require('body-parser')

/* eslint-disable import/no-dynamic-require */
const envPath = './../.env';
const fs = require('fs');

if (fs.existsSync(envPath)) {
  require('dotenv').config({ path: envPath });
}

app.use(bodyParser.json())

const port = 4000
const { AWS_S3_BUCKET, AWS_ACCESS_KEY, AWS_SECRET_ACCESS } = process.env;
const AWS_S3_BUCKET_URL = `https://${AWS_S3_BUCKET}.s3.amazonaws.com`;

const s3  = new AWS.S3({
	accessKeyId: AWS_ACCESS_KEY,
	secretAccessKey: AWS_SECRET_ACCESS,
	endpoint: AWS_S3_BUCKET_URL,
	s3ForcePathStyle: true,
	signatureVersion: 'v4',
});

app.use(function(req, res, next) {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
  next();
});

app.get('/', (req, res, next) => {
	res.send('Hello World!')
})

app.get('/start-upload', async (req, res, next) => {
	try {
		let params = {
			Bucket: AWS_S3_BUCKET,
			Key: req.query.fileName,
			ContentType: req.query.fileType
		}
		let createUploadPromised = BluebirdPromise.promisify(s3.createMultipartUpload.bind(s3))
    let uploadData = await createUploadPromised(params)
    console.debug({ uploadData })
		res.send({uploadId: uploadData.UploadId})
	} catch(err) {
		console.log(err)
	}
})

app.get('/get-upload-url', async (req, res, next) => {
	try {
		let params = {
			Bucket: AWS_S3_BUCKET,
			Key: req.query.fileName,
			PartNumber: req.query.partNumber,
			UploadId: req.query.uploadId
		}
		console.log(params)
	    let uploadPartPromised = BluebirdPromise.promisify(s3.getSignedUrl.bind(s3))
	    let presignedUrl = await uploadPartPromised('uploadPart', params)
		res.send({presignedUrl})
	} catch(err) {
		console.log(err)
	}
})

app.post('/complete-upload', async (req, res, next) => {
	try {
		console.log(req.body, ': body')
		let params = {
			Bucket: AWS_S3_BUCKET,
			Key: req.body.params.fileName,
			MultipartUpload: {
				Parts: req.body.params.parts
			},
			UploadId: req.body.params.uploadId
		}
		console.log(params)
	    let completeUploadPromised = BluebirdPromise.promisify(s3.completeMultipartUpload.bind(s3))
	    let data = await completeUploadPromised(params)
		res.send({data})
	} catch(err) {
		console.log(err)
	}
})

app.listen(port, () => console.log(`Example app listening on port ${port}!`))