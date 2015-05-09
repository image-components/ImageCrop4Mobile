# ImageCrop4Mobile

ImageCrop4Mobile is a minimalist image cropping widget with no dependences for mobile web.

[Online Demo](http://aijc.net:90/ImageCrop4Mobile/)

### Usage 

```js
var ic = new ImageCrop(document.querySelector('.container'), './mei.jpg', {
	onChanged: function(areaInfo) {
		console.log(areaInfo);
	}
});
```