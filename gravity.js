/* mouse handeling */
var 
mouseDown=false,
mousex=0,
mousey=0;

document.onmousedown = function(ev){ mouseDown=true; };
document.onmouseup   = function(ev){ mouseDown=false; };
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

/* gravity sim object */
function GravitySimulator(canvas){

	console.log('created');

	/* HTML canvas object */
	this.canvas = canvas;
	this.context = this.canvas.getContext("2d");

	this.bodys = new Array();

	this.gravityForce = 0.0015;
	this.gravityActivate = false;
	this.dispTrail = true;
	this.keepBounds = false;
	this.minDrag = 5;
	this.density = 0.8;
	this.defaultTrailLen = 100;
	this.showFabric = false;
	this.massByVolume = false;

	/* sloppy */
	this.canvas.width = window.innerWidth * 0.9;
	this.canvas.height = window.innerHeight * 0.9;

	/* public */
	this.start = function(){
		console.log('started');
		var self = this;
		setInterval(function(){ self.loop(); }, 10);
	}

	/* end constructor */

	/* private */
	var working=false, start_x, start_y, currbody;
	this.loop = function(){	
		//clear canvas
		this.canvas.width = this.canvas.width;

		if(mouseDown){

			if(this.working){

				//create vector
				if( dist(mousex, mousey, this.start_x, this.start_y) > Math.max(this.minDrag, this.currbody.radius) ){
					this.currbody.drawDragline();
					this.currbody.xmove = (mousex - this.start_x) * 0.01;
					this.currbody.ymove = (mousey - this.start_y) * 0.01;
				}

				//increase radius
				else{
					this.currbody.radius += 0.1;
					this.currbody.calcMass();
					this.currbody.xmove = 0;
					this.currbody.ymove = 0;
				}
			}

			//init
			else{
				if( mousex >= 0 && mousex <= this.canvas.width && mousey >= 0 && mousey <= this.canvas.height){ 
					this.currbody = new Body(this, mousex, mousey, 1);
					console.log('create');
					this.working = true;
					this.start_x = mousex;
					this.start_y = mousey;
				}
			}

			if(this.currbody != null){
				this.currbody.drawPlaceholder();
			}
		}
		else{
			//release after creation
			if(this.working){
				this.bodys.push( this.currbody );
			}

			this.working = false;
		}

		if(this.showFabric){
			this.drawLines();
		}

		this.drawBodys();
	}

	/* private */
	this.drawBodys = function()
	{
		if(this.gravityActivate){
			for(var index in this.bodys){
				this.bodys[index].calcForce();
			}
		}
		
		for(var index in this.bodys){
			if(this.gravityActivate){
				this.bodys[index].move();
				if(this.keepBounds){
					this.bodys[index].bounceWall();
				}
			}
			this.bodys[index].draw();
		}
	}

	/* private */
	this.recalcAllMass = function(){
		for(var index in this.bodys){
			this.bodys[index].calcMass();
		}
	}

	/* environment change functions */
	this.toggleGravity = function(){
		this.gravityActivate = !this.gravityActivate;
	}

	this.toggleTrail = function(){
		this.dispTrail = !this.dispTrail;
	}

	this.toggleBounds = function(){
		this.keepBounds = !this.keepBounds;
	}

	this.toggleFabric = function(){
		this.showFabric = !this.showFabric;
	}

	this.toggleMassFunction = function(){
		this.massByVolume = !this.massByVolume;
		this.recalcAllMass();
	}

	this.setDensity = function(density){
		this.density = density;
		this.recalcAllMass();
	}

	/* grid */
	this.drawLines = function()
	{
		var gridSize = 22, overlap = 200;
		var coord = new Array(Math.floor((this.canvas.width/gridSize) * (this.canvas.height/gridSize)));
		
		this.context.beginPath();
		this.context.strokeStyle = "rgba(00,00,255,0.3)";
		
		/* calc force from all frid points */
		for(var index in this.bodys){
			var body = this.bodys[index];
			
			for(var y= -overlap; y < this.canvas.height + overlap; y += gridSize){
				for(var x= -overlap; x < this.canvas.width + overlap; x += gridSize){
					if(coord[y*this.canvas.width + x] == undefined){
						coord[y*this.canvas.width + x] = [0,0];
					}

					/* mass/dist^2 */
					var distq = distSq(x, y, body.xpos, body.ypos);
					coord[y*this.canvas.width + x][0] += (2*Math.atan((body.mass)/(distq)))/Math.PI * ldist(x, body.xpos) * 0.5;
					coord[y*this.canvas.width + x][1] += (2*Math.atan((body.mass)/(distq)))/Math.PI * ldist(y, body.ypos) * 0.5;
				}
			}		
		}
		
		/* draw all points */
		for(var y= -overlap; y < this.canvas.height + overlap; y += gridSize){
			for(var x = -overlap; x < this.canvas.width + overlap; x += gridSize){
				var c = coord[y*this.canvas.width + x];
				//console.log(c[0] + " : " + x[1]);
				this.context.moveTo(x+c[0],y+c[1]);
				this.context.lineTo(x+c[0]+1,y+c[1]);
			}
		}	
		
		this.context.stroke();
	}
}
/* end gravity sim obj */ 

/* body object */
function Body(simulator, x, y, rad)
{
	/* simulator instance */
	this.simulator = simulator;

	/* canvas */
	this.canvas = simulator.canvas;

	/* context */
	this.context = simulator.context;

	/* phys vars */
	this.xpos = x;
	this.ypos = y;
	this.radius = rad;
	this.xforce = 0;
	this.yforce = 0;
	this.xmove = 0;
	this.ymove = 0;
	this.mass = 1;

	/* colors */
	this.color = "rgba(20,20,20,0.8)";
	this.trailColor = "rgba(255,140,0,0.15);";
	this.placeholderColor = "rgba(30,30,30,0.5);";
	this.triangleColor = "rgba(255,140,0,0.5);";

	/* trail vars */
	this.trailLength = simulator.defaultTrailLen;
	this.listX = new Array();
	this.listY = new Array();
	this.listX.push( this.xpos );
	this.listY.push( this.ypos );
	this.listPos = 1;

	this.calcMass = function(){

		if(simulator.massByVolume){
			this.mass = volRad(this.radius) * simulator.density;
		}
		else{
			this.mass = SARad(this.radius) * simulator.density;
		}
	}
	
	/*functions*/
	this.move = function(){

		//console.log(this.mass);

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

	/* still working on this */
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
		
		if( this.xpos >= this.canvas.width - this.radius - 1 ){
			this.xmove *= -1;
			this.xpos = this.canvas.width - this.radius - 1;
		}
		
		if( this.ypos >= this.canvas.height - this.radius - 1 ){
			this.ymove *= -1;
			this.ypos = this.canvas.height - this.radius - 1;
		}
	};

	this.drawVertTriangle = function(x, y){
		var width = 10, height = 10;

		this.context.beginPath();
		this.context.fillStyle = this.triangleColor;

		this.context.moveTo(x, y);

		this.context.lineTo(x-width, y-height);
		this.context.lineTo(x-width, y+height);

		this.context.lineTo(x+width, y-height);
		this.context.lineTo(x+width, y+height);

		this.context.fill();
	}

	this.drawHorTriangle = function(x, y){
		var width = 10, height = 10;

		this.context.beginPath();
		this.context.fillStyle = this.triangleColor;

		this.context.moveTo(x, y);

		this.context.lineTo(x-width, y-height);
		this.context.lineTo(x+width, y-height);

		this.context.lineTo(x-width, y+height);
		this.context.lineTo(x+width, y+height);

		this.context.fill();
	}

	this.drawCornerDiamond = function(x, y){

		var rad = 10;

		this.context.beginPath();
		this.context.fillStyle = this.triangleColor;

		this.context.moveTo(x-rad, y);
		this.context.lineTo(x, y+rad);
		this.context.lineTo(x+rad, y);
		this.context.lineTo(x, y-rad);

		this.context.fill();
	}

	this.drawMarkers = function(right, left, top, bottom){

		if(right){
			/* top right */
			if(top){
				this.drawCornerDiamond(this.canvas.width, 0);
			}
			/* bottom right */
			else if(bottom){
				this.drawCornerDiamond(this.canvas.width, this.canvas.height);
			}
			/* just right */
			else{
				this.drawVertTriangle(this.canvas.width, this.ypos);
			}
		}
		else if(left){
			/* top left */
			if(top){
				this.drawCornerDiamond(0, 0);
			}
			/* bottom left */
			else if(bottom){
				this.drawCornerDiamond(0, this.canvas.height);
			}
			/* just left */
			else{
				this.drawVertTriangle(0, this.ypos);
			}
		}
		/* just top */
		else if(top){
			this.drawHorTriangle(this.xpos, 0)
		}
		/* just bottom */
		else if(bottom){
			this.drawHorTriangle(this.xpos, this.canvas.height);
		}

		else{
			return false;
		}

		return true;
	}

	this.draw = function(){

		/* out of bounds */
		var right  = (this.xpos-this.radius) > this.canvas.width;
		var left   = (this.xpos+this.radius) < 0;
		var top    = (this.ypos+this.radius) < 0;
		var bottom = (this.ypos-this.radius) > this.canvas.height;

		if( !this.drawMarkers(right, left, top, bottom) ){
			this.context.beginPath();
			this.context.fillStyle = this.color;
			this.context.arc(this.xpos, this.ypos, this.radius, 0, Math.PI*2, true);		
			this.context.closePath();
			this.context.fill();
		}
		
		if(simulator.dispTrail){
			this.context.beginPath();
			this.context.strokeStyle = this.trailColor;
			
			for(var x=0; x < Math.min(this.trailLength, this.listY.length); x++){
				var p = (this.listY.length<this.trailLength)?x:(x + this.listPos) % this.trailLength;
				
				if( x==0 ){
					 this.context.moveTo(this.listX[p], this.listY[p]);
				}
				else{
					this.context.lineTo(this.listX[p], this.listY[p]);
				}
			}
			
		    this.context.stroke();
		}
	};

	this.drawPlaceholder = function(){
		this.context.beginPath();
		this.context.fillStyle = this.placeholderColor;
		this.context.arc(this.xpos, this.ypos, this.radius, 0, Math.PI*2, true);		
		this.context.closePath();
		this.context.stroke();
	};

	this.drawDragline = function(){
		this.context.beginPath();
		this.context.strokeStyle = "rgba(00,00,255,0.8)";
	    this.context.moveTo(this.xpos, this.ypos);
	    this.context.lineTo(mousex, mousey);
	    this.context.stroke();
	}

	this.calcForce = function(){
		this.xforce = 0;
		this.yforce = 0;

		var bodys = simulator.bodys;
		
		for(var index in bodys){
			var other = simulator.bodys[index];
			
			if(this != other){
				var xdis = other.xpos-this.xpos;
				var ydis = other.ypos-this.ypos;
				var disqr = Math.max(1, xdis*xdis + ydis*ydis);
				
				this.xforce += (simulator.gravityForce*this.mass*other.mass)/(disqr)*xdis;
				this.yforce += (simulator.gravityForce*this.mass*other.mass)/(disqr)*ydis;
			}
		}
		
		if(bodys.length > 1){
			this.xforce /= (bodys.length-1);
			this.yforce /= (bodys.length-1);
		}
	};
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
