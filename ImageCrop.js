;(function(win, factory) {
	if (typeof define === 'function' && (define.amd || define.cmd)) {
		define('ImageCrop', function() {
			return factory(win);
		});
	} else {
		win.ImageCrop = factory(win);
	}
})(this, function(win) {
	'use strict';

	var DOC = win.document;
	var hasTouch = 'ontouchstart' in win;
	var hasPointer = win.PointerEvent || win.MSPointerEvent;

	var touchEvents = {
		start: hasTouch ? 'touchstart' : (hasPointer ? prefixPointerEvent('pointerdown') : 'mousedown'),
		move: hasTouch ? 'touchmove' : (hasPointer ? prefixPointerEvent('pointermove') : 'mousemove'),
		end: hasTouch ? 'touchend' : (hasPointer ? prefixPointerEvent('pointerup') : 'mouseup'),
		cancel: hasTouch ? 'touchcancel' : (hasPointer ? prefixPointerEvent('pointercancel') : 'mousecancel')
	};

	/**
	 * ImageCrop constructor
	 * @param {Element} container the container element
	 * @param {String}  src       the image's src
	 * @param {Object}  options   options object
	 */
	function ImageCrop(container, src, options) {
		this.container = container;

		if (!options) options = {};
		this.options = {

			/* crop size */
			size: 200,

			/*
			 If true, the crop area will be rendered as an ellipse
			 instead of a rectangle.
			 */
			circle: false,

			onChanged: noop

		};
		for (var k in options) {
			if (options.hasOwnProperty(k)) {
				this.options[k] = options[k];
			}
		}

		this.initContainer();

		this.img = new Image();
		var that = this;
		this.img.onload = function() {
			that.initCard();
			that.originWidth = that.img.width;
			that.originHeight = that.img.height;
			that.imgWgtH = that.originWidth > that.originHeight;
			that.container.appendChild(that.img);
			that.init();
		};
		this.imgStyle = this.img.style;
		this.img.src = src;
	}

	ImageCrop.prototype = {

		constructor: ImageCrop,

		init: function() {
			this.initImg();

			this.initEvents();
		},

		initContainer: function() {
			var containerStyle = this.container.style;
			containerStyle.position = 'relative';
			containerStyle.overflow = 'hidden';

			this.updateContainerInfo();
		},

		updateContainerInfo: function() {
			this.containerWidth = this.container.offsetWidth;
			this.containerHeight = this.container.offsetHeight;
		},

		updateBounds: function() {
			if (!this.bounds) this.bounds = {};

			this.bounds.top = (this.containerHeight - this.options.size) / 2;
			this.bounds.left = (this.containerWidth - this.options.size) / 2;
			this.bounds.right = this.bounds.left + this.options.size;
			this.bounds.bottom = this.bounds.top + this.options.size;
		},

		initCard: function() {
			var card = DOC.createElement('div');

			card.style.cssText = 'z-index:10;position:absolute;top:50%;left:50%;width:' +
				this.options.size + 'px;height:' + this.options.size + 'px;overflow:hidden;' +
				'-webkit-transform:translate(-50%, -50%);-moz-transform:translate(-50%, -50%);' +
				'transform:translate(-50%, -50%);border:100px solid rgba(0,0,0,.8);border-width:' +
				this.containerHeight + 'px ' + this.containerWidth + 'px;' + (this.options.circle ?
					'border-radius:50%;' : '');

			this.card = card;

			this.container.appendChild(card);

			this.updateBounds();
		},

		initImg: function() {
			this.imgStyle.position = 'absolute';

			this.setImgSize(this.containerWidth * .8, this.containerHeight * .8);
			this.setImgPos();
		},

		setImgSize: function(w, h) {
			this._updateImgSize(w, h);
			this.updateImgSize();
		},

		_updateImgSize: function(w, h) {
			var whObj;
			if (this._imgWidth) {
				whObj = this.checkImgWH(w, h);
				if (whObj.width === this._imgWidth || whObj.height === this._imgHeight) return;
				w = whObj.width;
				h = whObj.height;
			}
			if (this.imgWgtH) {
				h = 'auto';
				w = w + 'px';
			} else {
				w = 'auto';
				h = h + 'px';
			}
			
			this.imgStyle.width = w;
			this.imgStyle.height = h;

			this._imgWidth = this.img.offsetWidth;
			this._imgHeight = this.img.offsetHeight;

			if (!whObj) {
				this._updateImgSize(this._imgWidth, this._imgHeight);
			}
		},

		checkImgWH: function(w, h) {
			var size = this.options.size;
			if (this.imgWgtH) {
				if (h < size) {
					w = w + w * (size - h) / h;
					h = size;
				}
			} else {
				if (w < size) {
					h = h + h * (size - w) / w;
					w = size;
				}
			}
			return {
				width: w,
				height: h
			};
		},

		updateImgSize: function() {
			this.imgWidth = this._imgWidth;
			this.imgHeight = this._imgHeight;
		},

		setImgPos: function(top, left) {
			if (top === undefined) {
				top = (this.containerHeight - this.imgHeight) / 2;
			}
			if (left === undefined) {
				left = (this.containerWidth - this.imgWidth) / 2;
			}

			this._updateImgPos(top, left);
			this.updateImgPos();
		},

		_updateImgPos: function(top, left) {
			var bounds = this.bounds;

			if (top > bounds.top) {
				top = bounds.top;
			}
			if (top + this.imgHeight < bounds.bottom) {
				top = bounds.bottom - this.imgHeight;
			}
			if (left > bounds.left) {
				left = bounds.left;
			}
			if (left + this.imgWidth < bounds.right) {
				left = bounds.right - this.imgWidth;
			}
			this._top = top;
			this._left = left;

			this.imgStyle.top = top + 'px';
			this.imgStyle.left = left + 'px';

			this.options.onChanged.call(this, this.getAreaInfo());
		},

		updateImgPos: function() {
			this.top = this._top;
			this.left = this._left;
		},

		getAreaInfo: function() {
			return {
				top: this.bounds.top - this._top,
				left: this.bounds.left - this._left,
				size: this.options.size,
				width: this.imgWidth,
				height: this.imgHeight
			};
		},

		initEvents: function() {
			this.container.addEventListener(touchEvents.start, this, false);
			this.onOrientationChangeProxy = proxyOrientationChange(this.onOrientationChange, this);
			win.addEventListener('orientationchange', this.onOrientationChangeProxy, false);
			win.addEventListener('resize', this.onOrientationChangeProxy, false);
			win.addEventListener('resize', this, false);
		},

		handleEvent: function(e) {
			switch (e.type) {
				case touchEvents.start:
					this.onTouchStart(e);
					break;
				case touchEvents.move:
					this.onTouchMove(e);
					break;
				case touchEvents.end:
				case touchEvents.cancel:
					this.onTouchEnd(e);
					break;
				case 'resize':
					this.onResize(e);
					break;
			}
		},

		onTouchStart: function(e) {
			this.started = true;

			this.container.removeEventListener(touchEvents.move, this, false);
			this.container.removeEventListener(touchEvents.end, this, false);
			this.container.removeEventListener(touchEvents.cancel, this, false);
			this.container.addEventListener(touchEvents.move, this, false);
			this.container.addEventListener(touchEvents.end, this, false);
			this.container.addEventListener(touchEvents.cancel, this, false);

			var point = e.touches ? e.touches[0] : e;
			this.touchObj = {
				firstX: point.pageX,
				firstY: point.pageY,
				secondX: 0,
				secondY: 0
			};

			if (e.touches && e.touches.length === 2) {
				point = e.touches[1];
				this.touchObj.secondX = point.pageX;
				this.touchObj.secondY = point.pageY;
			}

		},

		onTouchMove: function(e) {
			if (!this.started) return;
			e.preventDefault();

			if (e.touches && e.touches.length === 2) {
				// resize and move
				this.onResizeMove(e.touches[0], e.touches[1]);
			} else {
				// move
				this.onMove(e.touches ? e.touches[0] : e);
			}
		},

		onResizeMove: function(touch1, touch2) {
			var touchObj = this.touchObj;

			var oldDX = Math.abs(touchObj.firstX - touchObj.secondX);
			var oldDY = Math.abs(touchObj.firstY - touchObj.secondY);

			var newDX = Math.abs(touch2.pageX - touch1.pageX);
			var newDY = Math.abs(touch2.pageY - touch1.pageY);

			var widthChange = newDX - oldDX;
			var heightChange = newDY - oldDY;

			var sizeChanged = 0;
			if (Math.abs(widthChange) > Math.abs(heightChange)) {
				sizeChanged = widthChange;
			} else {
				sizeChanged = heightChange;
			}
			var w = this.imgWidth;
			var h = this.imgHeight;

			this.setImgSize(w + sizeChanged, h + sizeChanged);

			widthChange = this.imgWidth - w;
			heightChange = this.imgHeight - h;
			var top = this._top - heightChange / 2;
			var left = this._left - widthChange / 2;

			this._updateImgPos(top, left);

			touchObj.firstX = touch2.pageX;
			touchObj.firstY = touch2.pageY;
			touchObj.secondX = touch1.pageX;
			touchObj.secondY = touch1.pageY;
		},

		onMove: function(point) {
			var top = this.top;
			var left = this.left;
			top += point.pageY - this.touchObj.firstY;
			left += point.pageX - this.touchObj.firstX;
			this._updateImgPos(top, left);
		},

		onTouchEnd: function(e) {
			this.container.removeEventListener(touchEvents.move, this, false);
			this.container.removeEventListener(touchEvents.end, this, false);
			this.container.removeEventListener(touchEvents.cancel, this, false);

			this.updateImgSize();
			this.updateImgPos();
		},

		onResize: function() {
			var w = this.containerWidth;
			var h = this.containerHeight;

			this.updateContainerInfo();

			this.updateBounds();

			var diffW = this.containerWidth - w;
			var diffH = this.containerHeight - h;

			this.setImgPos(this.top + diffH / 2, this.left + diffW / 2);
		},

		onOrientationChange: function() {
			this.onResize();
		},

		destroy: function() {
			if (!this.destroyed) {
				this.destroyed = true;
				this.container.removeEventListener(touchEvents.start, this, false);
				this.container.removeEventListener(touchEvents.move, this, false);
				this.container.removeEventListener(touchEvents.end, this, false);
				this.container.removeEventListener(touchEvents.cancel, this, false);
				win.removeEventListener('orientationchange', this.onOrientationChangeProxy, false);
				win.removeEventListener('resize', this.onOrientationChangeProxy, false);
				win.removeEventListener('resize', this, false);

				this.container = null;
				this.area = null;
				this.imgStyle = null;
				this.img = null;
			}
		}

	};

	return ImageCrop;

	function noop() {}

	function prefixPointerEvent(name) {
		return win.MSPointerEvent ?
			'MSPointer' + name.charAt(9).toUpperCase() + name.substr(10) :
			name;
	}

	function proxyOrientationChange(fn, context) {
		return function(e) {
			var args = [].slice.call(arguments, 0);
			var orientation = isPortrait();
			if (fn.lastOrientation !== orientation) {
				fn.lastOrientation = orientation;
				fn.apply(context || win, args);
			}
		};
	}

	function isPortrait() {
		return win.innerHeight > win.innerWidth;
	}

});
