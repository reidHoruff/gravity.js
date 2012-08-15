var canvas, ctx,
mouseDown = false,
wasDown = false,
bodys = new Array(), 
mousex, 
mousey,
downx,
downy,
upx,
upy,
gravity = 0.002,
minDrag = 3,
gravityActivate = false,
dispTrail = true,
keepBounds = true,
minDrag = 5,
defaultDensity = 0.8,
defaultTrailLen = 500;

function init()
{
	canvas = document.getElementById("gravity-canvas");
	ctx = canvas.getContext("2d");

	document.onmousedown = function(ev){ mouseDown = true };
	document.onmouseup = function(ev){ mouseDown = false; };
	document.onmousemove = function(ev){
		if(ev.offsetX){
			mousex = ev.offsetX; 
			mousey = ev.offsetY;
		}
		else{
			mousex = ev.layerX; 
			mousey = ev.layerY;
		}
	};
	
	canvas.width = window.innerWidth * 0.9; 
	canvas.height = window.innerHeight * 0.9;
	
	setInterval(loop, 10);
}

/* body object */
function body(x, y, r)
{
	/* phys vars */
	this.xpos = x;
	this.ypos = y;
	this.radius = r;
	this.xforce = 0;
	this.yforce = 0;
	this.xmove = 0;
	this.ymove = 0;
	this.density = defaultDensity;
	this.mass = volRad(this.radius) * this.density;

	/* colors */
	this.color = "rgba(20,20,20,0.8)";
	this.trailColor = "rgba(255,140,0,0.2);";
	this.placeholderColor = "rgba(30,30,30,0.5);";

	/* trail vars */
	this.trailLength = defaultTrailLen;
	this.listX = new Array();
	this.listY = new Array();
	this.listX.push( this.xpos );
	this.listY.push( this.ypos );
	this.listPos = 1;
	
	/*functions*/
	this.move = function(){

		this.xmove += this.xforce/this.mass;
		this.ymove += this.yforce/this.mass;
		
		this.xpos += this.xmove;
		this.ypos += this.ymove;
		
		var lp = (this.listPos + this.trailLength - 1) % this.trailLength;
		
		if(Math.abs(this.listX[lp]-this.xpos) >= 1 || Math.abs(this.listY[lp]-this.ypos) >= 1){
			this.listX[this.listPos] = this.xpos;
			this.listY[this.listPos] = this.ypos;
			this.listPos++;
			this.listPos %= this.trailLength;	
		}
	};

	this.collide = function(other){
		var ci = other.xpos - this.xpos;
		var cj = other.ypos - this.ypos;
		var cc = (this.xmove * ci) + (this.ymove * cj); //dot product
		var v = Math.sqrt( this.xmove*this.xmove + this.ymove*this.ymove );
		var nv = (v*(this.mass-other.mass) + (2*other.mass*v))/(this.mass+other.mass);	
	};

	this.bounceWall = function(){
		if( this.xpos <= this.radius + 1 ){
			this.xmove *= -1;
			this.xpos = this.radius + 1;
		}
		
		if( this.ypos <= this.radius + 1 ){
			this.ymove *= -1;
			this.ypos = this.radius + 1;
		}
		
		if( this.xpos >= canvas.width - this.radius - 1 ){
			this.xmove *= -1;
			this.xpos = canvas.width - this.radius - 1;
		}
		
		if( this.ypos >= canvas.height - this.radius - 1 ){
			this.ymove *= -1;
			this.ypos = canvas.height - this.radius - 1;
		}
	};

	this.draw = function(){
		ctx.beginPath();
		ctx.fillStyle = this.color;
		ctx.arc(this.xpos, this.ypos, this.radius, 0, Math.PI*2, true);		
		ctx.closePath();
		ctx.fill();
		
		if(!dispTrail){
			return;
		}
			
		ctx.beginPath();
		ctx.strokeStyle = this.trailColor;
		
		for(var x=0; x < Math.min(this.trailLength, this.listY.length); x++){
			var p = (this.listY.length<this.trailLength)?x:(x + this.listPos) % this.trailLength;
			
			if( x==0 ){
				 ctx.moveTo(this.listX[p], this.listY[p]);
			}
			else{
				ctx.lineTo(this.listX[p], this.listY[p]);
			}
		}
		
	    ctx.stroke();
	};

	this.drawPlaceholder = function(){
		ctx.beginPath();
		ctx.fillStyle = this.placeholderColor;
		ctx.arc(this.xpos, this.ypos, this.radius, 0, Math.PI*2, true);		
		ctx.closePath();
		ctx.stroke();
	};

	this.calcForce = function(){
		this.xforce = 0;
		this.yforce = 0;
		
		for(var index in bodys){
			var other = bodys[index];
			
			if(this != other){
				var xdis = other.xpos-this.xpos;
				var ydis = other.ypos-this.ypos;
				var disqr = xdis*xdis + ydis*ydis;
				
				this.xforce += (gravity*this.mass*other.mass)/(disqr)*xdis;
				this.yforce += (gravity*this.mass*other.mass)/(disqr)*ydis;
			}
		}
		
		if(bodys.length > 1){
			this.xforce /= (bodys.length-1);
			this.yforce /= (bodys.length-1);
		}
	};

	this.drawDragline = function(){
		ctx.beginPath();
		ctx.strokeStyle = "rgba(00,00,255,0.8)";
	    ctx.moveTo(this.xpos, this.ypos);
	    ctx.lineTo(mousex, mousey);
	    ctx.stroke();
	}
}

function forcefromPoint(x, y)
{
	var xforce = 0;
	var yforce = 0;
	
	for(var index in bodys){
		var other = bodys[index];
		
		var xdis = other.xpos-x;
		var ydis = other.ypos-y;
		var disqr = xdis*xdis + ydis*ydis;
			
		xforce += (gravity*other.mass)/(disqr)*xdis;
		yforce += (gravity*other.mass)/(disqr)*ydis;
	}
	
	if(bodys.length > 1){
		xforce /= (bodys.length-1);
		yforce /= (bodys.length-1);
	}
	
	return{
		'xforce':xforce,
		'yforce':yforce
	};
}

function nearestObject(x, y)
{
	var xpos = -1, ypos = -1, min = -1;
	
	for(var index in bodys){
		var body = bodys[index];
		var xdis = body.xpos-x;
		var ydis = body.ypos-x;
		var dis = Math.sqrt(xdis*xdis + ydis*ydis);
		
		if(min < 0 || min > dis){
			min = dis;
			xpos = body.xpos;
			ypos = body.ypos;
		}
	}
	
	return{
		'xpos':xpos,
		'ypos':ypos
	};	
}

function drawLines()
{
	var gridSize = 10;	
	var coord = new Array(Math.floor((canvas.width/gridSize) * (canvas.height/gridSize)));
	
	ctx.beginPath();
	ctx.strokeStyle = "rgba(00,00,255,0.8)";
	
	for(var index in bodys){
		var body = bodys[index];
		
		for(var y=gridSize; y < canvas.height; y += gridSize){
			for(var x=gridSize; x < canvas.width; x += gridSize){
				if(coord[y*canvas.width + x] == undefined){
					coord[y*canvas.width + x] = [0,0];
				}
				/* mass/dist^2 */
				
				var distq = distSq(x, y, body.xpos, body.ypos);
				coord[y*canvas.width + x][0] += (2*Math.atan((body.mass)/(distq)))/Math.PI * ldist(x, body.xpos) * 0.5;
				coord[y*canvas.width + x][1] += (2*Math.atan((body.mass)/(distq)))/Math.PI * ldist(y, body.ypos) * 0.5;
			}
		}		
	}
	
	for(var y=gridSize; y < canvas.height; y += gridSize){
		for(var x=gridSize; x < canvas.width; x += gridSize){
			var c = coord[y*canvas.width + x];
			//console.log(c[0] + " : " + x[1]);
			ctx.moveTo(x+c[0],y+c[1]);
			ctx.lineTo(x+c[0]+1,y+c[1]);
		}
	}	
	
	ctx.stroke();
}

var working=false, start_x, start_y, currbody;

function loop()
{	
	//clear canvas
	canvas.width = canvas.width;

	if(mouseDown){
		if(working){

			//create vector
			if( dist(mousex, mousey, start_x, start_y) > Math.max(minDrag, currbody.radius) ){
				currbody.drawDragline();
				currbody.xmove = (mousex - start_x) * 0.01;
				currbody.ymove = (mousey - start_y) * 0.01;
			}

			//increase radius
			else{
				currbody.radius += 0.1;
				currbody.mass = volRad(currbody.radius) * currbody.density;
				currbody.xmove = 0;
				currbody.ymove = 0;
			}
		}

		//init
		else{
			if( mousex >= 0 && mousex <= canvas.width && mousey >= 0 && mousey <= canvas.height){ 
				currbody = new body(mousex, mousey, 1);
				working = true;
				start_x = mousex;
				start_y = mousey;
			}
		}

		if(currbody != null){
			currbody.drawPlaceholder();
		}
	}
	else{
		//release after creation
		if(working){
			bodys.push( currbody );
		}

		working = false;
	}

	drawLines();	
	drawbodys();
}

function drawbodys()
{
	if(gravityActivate){
		for(var index in bodys){
			bodys[index].calcForce();
		}
	}
	
	for(var index in bodys){
		if(gravityActivate){
			bodys[index].move();
			if(keepBounds){
				bodys[index].bounceWall();
			}
		}
		bodys[index].draw();
	}
}

function toggleGravity()
{
	gravityActivate = !gravityActivate;
}

function toggleTrail()
{
	dispTrail = !dispTrail;
}

function toggleBounds()
{
	keepBounds = !keepBounds;
}


/*math helper functions */
function sign(x)
{
	if(x>0)
		return 1;
		
	else if(x<0)
		return -1;
		
	else
		return 0;
}

/* dot product */
function dp(j, k, j_, k_)
{
	return (j*j_) + (k*k_);
}

/* volume */
function volRad(r)
{
	return (4.0/3.0)*Math.PI*(r*r*r);
}

/* surface area */
function SARad(r)
{
	return Math.PI*r*r;
}

function ldist(x, y)
{
	return y-x;
}

function dist(x, y, x_, y_)
{
	return Math.sqrt((x-x_)*(x-x_) + (y-y_)*(y-y_));
}

function distSq(x, y, x_, y_)
{
	return (x-x_)*(x-x_) + (y-y_)*(y-y_);
}

function randomInt(range)
{
	return Math.floor(Math.random()*range);
}
