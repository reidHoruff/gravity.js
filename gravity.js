/* mouse handeling */
var 
mouseDown=false,
mousex=0,
mousey=0,
downx=0,
downy=0,
controlKey=false;

document.onmousedown = function(ev){
	controlKey = (ev.ctrlKey==1);
	mouseDown=true;

	if(ev.offsetX){
		downx = ev.offsetX; 
		downy = ev.offsetY;
	}
	else{
		downx = ev.layerX; 
		downy = ev.layerY;
	}
};

document.onmouseup = function(ev){
	mouseDown=false;
};

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

	/* HTML canvas object */
	this.canvas = canvas;
	this.context = this.canvas.getContext("2d");

	this.bodys = new Array();

	this.gravityForce = 0.001;
	this.gravityActivate = false;
	this.dispTrail = true;
	this.keepBounds = false;
	this.minDrag = 5;
	this.density = 1;
	this.defaultTrailLen = 100;
	this.showFabric = false;
	this.massByVolume = false;
	this.maxObjectRadius = 50;

	/* not curr used */
	this.univOffsetX = 0;
	this.univOffsetY = 0;

	/* universe zoom */
	this.zoom = 1;

	/* sloppy */
	this.canvas.width = window.innerWidth * 0.9;
	this.canvas.height = window.innerHeight * 0.85;

	/* public */
	this.start = function(){
		console.log('started');
		var self = this;
		setInterval(function(){ self.loop(); }, 12);
	}

	/* end constructor */

	/* private */
	var creating=false, moving=false, currbody, offsetx, offsety;
	this.loop = function(){	
		//clear canvas
		this.canvas.width = this.canvas.width;

		if(mouseDown){

			/* shift universe */
			if(controlKey){
				this.shiftUniverse(mousex-downx, mousey-downy);
				downx = mousex;
				downy = mousey;
			}

			/* create object */
			else if(this.creating){

				//create vector
				if( dist(mousex, mousey, downx, downy) > Math.max(this.minDrag, this.currbody.drawrad) ){
					this.currbody.drawDragline();
					this.currbody.xmove = (mousex-downx) * 0.02;
					this.currbody.ymove = (mousey-downy) * 0.02;
				}

				//increase radius
				else{
					this.currbody.setRad( this.currbody.radius+0.1 );
					this.currbody.calcMass();
					this.currbody.xmove = 0;
					this.currbody.ymove = 0;
				}
			}

			/* move exiting body */
			else if(this.moving){
				/* relation to center */
				this.currbody.drawx = mousex - this.offsetx;
				this.currbody.drawy = mousey - this.offsety;
				this.currbody.calcPhysCoords();
			}

			//init
			else{
				if( mousex >= 0 && mousex <= this.canvas.width && mousey >= 0 && mousey <= this.canvas.height){

					var body = this.getBody(mousex, mousey);

					/* is touching body */
					if(body !== false){
						this.currbody = body;

						/* kill velocity */
						body.xmove = 0;
						body.ymove = 0;

						/* relation to center */
						this.offsetx = mousex - body.drawx;
						this.offsety = mousey - body.drawy;

						this.moving = true;
					}

					/* create */
					else{
						this.currbody = new Body(this, mousex, mousey, 1);
						this.creating = true;
					}
				}
			}

			if(this.currbody != null && this.creating){
				this.currbody.drawPlaceholder();
			}
		}
		else{
			//release after creation
			if(this.creating){
				this.bodys.push( this.currbody );
				this.currbody = null;
				this.creating = false;
			}

			else if(this.moving){
				this.moving = false;
			}
		}

		if(this.showFabric){
			this.drawLines();
		}

		this.drawBodys();
	}

	this.getBody = function(x, y){
		for(index in this.bodys){
			var body = this.bodys[index];

			if(dist(x, y, body.drawx, body.drawy) < body.drawrad ){
				return body;
			}
		}

		return false;
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

	this.shiftUniverse = function(x, y){
		this.univOffsetX = x;
		this.univOffsetY = y;

		/* shift all objects */
		for(var index in this.bodys){
			this.bodys[index].shiftPos(x, y);
		}
	}

	this.setZoom = function(z){
		this.zoom += z;

		for(var index in this.bodys){
			this.bodys[index].calcDrawCoords();
		}
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
					var distq = distSq(x, y, body.drawx, body.drawy);
					coord[y*this.canvas.width + x][0] += (2*Math.atan((body.mass)/(distq)))/Math.PI * ldist(x, body.drawx) * 0.5;
					coord[y*this.canvas.width + x][1] += (2*Math.atan((body.mass)/(distq)))/Math.PI * ldist(y, body.drawy) * 0.5;
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
/* coords are draw coords */
function Body(simulator, dx, dy, drad)
{
	/* simulator instance */
	this.simulator = simulator;

	/* canvas */
	this.canvas = simulator.canvas;

	/* context */
	this.context = simulator.context;

	/* disp vars */
	this.drawx = dx;
	this.drawy = dy;
	this.drawrad = drad;

	/* phys vars */

	/* calc x,y,r from draw coords */
	this.xpos = this.drawx / this.simulator.zoom;
	this.ypos = this.drawy / this.simulator.zoom;
	this.radius = this.drawrad / this.simulator.zoom;
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

	/* shifts according to disp coords */
	this.shiftPos = function(x_shift, y_shift){
		this.drawx += x_shift;
		this.drawy += y_shift;

		/* adjust actual coords */
		this.xpos = this.drawx / this.simulator.zoom;
		this.ypos = this.drawy / this.simulator.zoom;

		for(var x=0; x < Math.min(this.trailLength, this.listY.length); x++){
			this.listX[x] += x_shift / this.simulator.zoom;
			this.listY[x] += y_shift / this.simulator.zoom;
		}
	}

	this.setRad = function(r){
		//this.radius = Math.min(r, this.simulator.maxObjectRadius);
		this.radius = r;
		this.calcDrawCoords();
	}

	/* draw coords from phys coords */
	this.calcDrawCoords = function(){
		this.drawx = this.xpos * this.simulator.zoom;
		this.drawy = this.ypos * this.simulator.zoom;
		this.drawrad = this.radius * this.simulator.zoom;
	}

	/* phys coords from draw coords */
	this.calcPhysCoords = function(){
		this.xpos = this.drawx / this.simulator.zoom;
		this.ypos = this.drawy / this.simulator.zoom;
		this.radius = this.drawrad / this.simulator.zoom;
	}
	
	/*functions*/
	this.move = function(){

		//console.log(this.mass);

		this.xmove += this.xforce/this.mass;
		this.ymove += this.yforce/this.mass;
		
		this.xpos += this.xmove;
		this.ypos += this.ymove;
		
		/* trail */
		var lp = (this.listPos + this.trailLength - 1) % this.trailLength;
		
		if(Math.abs(this.listX[lp]-this.xpos) >= 1 || Math.abs(this.listY[lp]-this.ypos) >= 1){
			this.listX[this.listPos] = this.xpos;
			this.listY[this.listPos] = this.ypos;
			this.listPos++;
			this.listPos %= this.trailLength;	
		}
	};

	this.calcMass = function(){

		if(simulator.massByVolume){
			this.mass = volRad(this.radius) * simulator.density;
		}
		else{
			this.mass = SARad(this.radius) * simulator.density;
		}
	}

	this.calcForce = function(){
		this.xforce = 0;
		this.yforce = 0;

		var bodys = simulator.bodys;

		/* calc sum force vector from all other objects */
		
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
		if( this.drawx <= this.drawrad + 1 ){
			console.log('left');
			this.xmove *= -1;
			this.drawx = this.drawrad + 2;
			this.calcPhysCoords();
		}
		
		if( this.drawy <= this.drawrad + 1 ){
			this.ymove *= -1;
			this.drawy = this.drawrad + 2;
			this.calcPhysCoords();
		}
		
		if( this.drawx >= this.canvas.width - this.drawrad - 1 ){
			this.xmove *= -1;
			this.drawx = this.canvas.width - this.drawrad - 2;
			this.calcPhysCoords();
		}
		
		if( this.drawy >= this.canvas.height - this.drawrad - 1 ){
			this.ymove *= -1;
			this.drawy = this.canvas.height - this.drawrad - 2;
			this.calcPhysCoords();
		}
	};

	/* main draw function */
	this.draw = function(){

		/* calc draw coords from phys coords */
		this.calcDrawCoords();

		/* out of bounds bools*/
		var right  = (this.drawx-this.drawrad) > this.canvas.width;
		var left   = (this.drawx+this.drawrad) < 0;
		var top    = (this.drawy+this.drawrad) < 0;
		var bottom = (this.drawy-this.drawrad) > this.canvas.height;

		/* draw out of bounds markers else draw body */
		if( !this.drawMarkers(right, left, top, bottom) ){
			this.drawBody();
		}
		
		if(simulator.dispTrail){
			this.drawTrail();
		}
	};

	/* draw trail */

	this.drawTrail = function(){

		this.context.beginPath();
		this.context.strokeStyle = this.trailColor;
		
		for(var x=0; x < Math.min(this.trailLength, this.listY.length); x++){

			/* list trunc */
			var p = (this.listY.length<this.trailLength)?x:(x + this.listPos) % this.trailLength;

			/* stores phys coords so must be so draw coords must be calculated here */
			
			if( x==0 ){
				 this.context.moveTo(this.listX[p]*this.simulator.zoom, this.listY[p]*this.simulator.zoom);
			}
			else{
				this.context.lineTo(this.listX[p]*this.simulator.zoom, this.listY[p]*this.simulator.zoom);
			}
		}
		
	    this.context.stroke();
	}

	/* verticle out of bounds triangle */
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

	/* horizontal out of bounds triangle */
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

	/* corner out of bounds diamond */
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

	/* braws appropriate out of bounds marker */
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
				this.drawVertTriangle(this.canvas.width, this.drawy);
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
				this.drawVertTriangle(0, this.drawy);
			}
		}
		/* just top */
		else if(top){
			this.drawHorTriangle(this.drawx, 0)
		}
		/* just bottom */
		else if(bottom){
			this.drawHorTriangle(this.drawx, this.canvas.height);
		}

		else{
			return false;
		}

		return true;
	}

	/* draws placeholder while body is being created */
	this.drawPlaceholder = function(){
		this.context.beginPath();
		this.context.fillStyle = this.placeholderColor;
		this.context.arc(this.drawx, this.drawy, this.drawrad, 0, Math.PI*2, true);		
		this.context.closePath();
		this.context.fill();
	};

	/* draws velocity vector during creation */
	this.drawDragline = function(){
		this.context.beginPath();
		this.context.strokeStyle = "rgba(00,00,255,0.8)";
	    this.context.moveTo(this.drawx, this.drawy);
	    this.context.lineTo(mousex, mousey);
	    this.context.stroke();
	}

	/* draws the actual body */
	this.drawBody = function(){
		this.context.beginPath();
		this.context.fillStyle = this.color;
		this.context.arc(this.drawx, this.drawy, this.drawrad, 0, Math.PI*2, true);		
		this.context.closePath();
		this.context.fill();
	}
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
