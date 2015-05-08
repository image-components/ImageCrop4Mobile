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

	function ImageCrop(container, src, options) {
		this.container = container;

		if (!options) options = {};
		this.options = {

			size: 200,

			onChanged: noop

		};
		for (var k in options) {
			if (options.hasOwnProperty(k)) {
				this.options[k] = options[k];
			}
		}

		this.initContainer();
		this.initCard();

		this.img = new Image();
		var that = this;
		this.img.onload = function() {
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

			card.style.cssText = 'z-index:10;position:absolute;top:50%;left:50%;width:' + this.options.size + 'px;height:' + this.options.size + 'px;overflow:hidden;;transform:translate(-50%, -50%);border:100px solid rgba(255,255,255,.8);border-width:' + this.containerHeight + 'px ' + this.containerWidth + 'px;';

			this.card = card;

			this.container.appendChild(card);

			this.updateBounds();
		},

		initImg: function() {
			this.imgStyle.position = 'absolute';

			this.updateImgSize(this.containerWidth * .8, this.containerHeight * .8);
			this.updateImgPos();

		},

		updateImgSize: function(w, h) {
			if (this.imgWgtH) {
				h = 'auto';
				w += 'px';
			} else {
				w = 'auto';
				h += 'px';
			}
			
			this.setImgSize(w, h);

			if (this.imgWgtH) {
				if (this.imgHeight < this.options.size) {
					w = this.imgWidth + this.imgWidth * this.options.size / this.imgHeight;
					w += 'px';
					this.setImgSize(w, h);
				}
			} else {
				if (this.imgWidth < this.options.size) {
					h = this.imgHeight + this.imgHeight * this.options.size / this.imgWidth;
					h += 'px';
					this.setImgSize(w, h);
				}
			}
		},

		setImgSize: function(w, h) {
			this.imgStyle.width = w;
			this.imgStyle.height = h;

			this.imgWidth = this.img.offsetWidth;
			this.imgHeight = this.img.offsetHeight;
		},

		updateImgPos: function(top, left) {
			if (top === undefined) {
				top = (this.containerHeight - this.imgHeight) / 2;
			}
			if (left === undefined) {
				left = (this.containerWidth - this.imgWidth) / 2;
			}

			this.setImgPos(top, left);
			this.setPos();
		},

		setImgPos: function(top, left) {
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

		getAreaInfo: function() {
			return {
				top: this.bounds.top - this._top,
				left: this.bounds.left - this._left,
				size: this.options.size,
				width: this.imgWidth,
				height: this.imgHeight
			};
		},

		setPos: function() {
			this.top = this._top;
			this.left = this._left;
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
				this.onReszeMove(e.touches[0], e.touches[1]);
			} else {
				// move
				this.onMove(e.touches ? e.touches[0] : e);
			}
		},

		onReszeMove: function(touch1, touch2) {
			var touchObj = this.touchObj;

			var oldDX = Math.abs(touchObj.firstX - touchObj.secondX);
			var oldDY = Math.abs(touchObj.firstY - touchObj.secondY);

			var newDX = Math.abs(touch2.pageX - touch1.pageX);
			var newDY = Math.abs(touch2.pageY - touch1.pageY);

			var widthChange = newDX - oldDX;
			var heightChange = newDY - oldDY;

			var oldXCenter = Math.min(touchObj.firstX, touchObj.secondX) + oldDX / 2;
			var oldYCenter = Math.min(touchObj.firstY, touchObj.secondY) + oldDY / 2;

			var newXCenter = Math.min(touch1.pageX, touch2.pageX) + newDX / 2;
			var newYCenter = Math.min(touch1.pageY, touch2.pageY) + newDY / 2;

			var moveX = newXCenter - oldXCenter;
			var moveY = newYCenter - oldYCenter;

			var sizeChanged = Math.abs(widthChange) > Math.abs(heightChange) ? widthChange : heightChange;
			var w = this.imgWidth + sizeChanged;
			var h = this.imgHeight + sizeChanged;

			var top = this.top + sizeChanged / 2;
			var left = this.left + sizeChanged / 2;

			this.updateImgSize(w, h);
			this.setImgPos(top, left);

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
			this.setImgPos(top, left);
		},

		onTouchEnd: function(e) {
			this.container.removeEventListener(touchEvents.move, this, false);
			this.container.removeEventListener(touchEvents.end, this, false);
			this.container.removeEventListener(touchEvents.cancel, this, false);

			this.setPos();
		},

		onResize: function() {
			this.updateContainerInfo();

			this.updateBounds();

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