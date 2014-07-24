function Cell(index){
	if(typeof index !== 'object'){
		this.media = {
		};
		this.index = index;
	}
}

function Row(data){
	this.collection(Cell);
	if(data && data.cells){
		this.cells.load(data.cells);
	}
}

Row.prototype.remainingSpace = function(){
	var maxSize = 12;
	var usedSpace = 0;
	this.cells.forEach(function(cell){
		usedSpace += cell.width;
	});
	return maxSize - usedSpace;
};

Row.prototype.addCell = function(cell){
	cell.width = 1;
	cell.index = this.cells.length();
	cell.row = this.index;

	var remainingSpace = this.remainingSpace();

	if(remainingSpace === 0){
		var newSize = parseInt(12 / (this.cells.length() + 1));
		if(newSize > 3){
			this.cells.forEach(function(cell){
				cell.width = newSize;
			});
			setTimeout(function(){
				cell.width = newSize;
				this.cells.trigger('change');
			}.bind(this), 50);

			this.cells.push(cell);
			return cell;
		}
		return false;
	}
	if(remainingSpace > 0){
		cell.width = remainingSpace;
		this.cells.push(cell);
		return cell;
	}
};

Row.prototype.hasLeftOvers = function(){
	return this.cells.length() !== 12;
};

Row.prototype.setIndex = function(cell, index){
	this.cells.remove(cell);
	this.cells.insertAt(index, cell);
};

function Page(data){
	this.collection(Row);
	if(data && data.rows){
		this.rows.load(data.rows);
	}
}

Page.prototype.addRow = function(){
	var row = new Row();
	this.rows.push(row);
	row.index = this.rows.length() - 1;
	return row;
};

Page.prototype.addRowAt = function(previousRow){
	var row = new Row();
	this.rows.insertAt(this.rows.getIndex(previousRow) + 1, row);
	row.index = this.rows.getIndex(previousRow) + 1;
	return row;
};

Page.prototype.moveCell = function(cell, newIndex){
	this.rows.find(function(row){
		return row.cells.all.indexOf(cell) !== -1;
	}).cells.remove(cell);
	this.rows.findWhere({ index: newIndex }).cells.insertAt(cell.index, cell);
};

Page.prototype.toJSON = function(){
	return {
		title: this.title,
		titleLink: this.titleLink,
		rows: this.rows
	}
}

function Website(data){
	this.collection(Page);
	if(data && data.pages){
		this.pages.load(data.pages);
	}
}

Website.prototype.remove = function(){
	http().delete('/pages/' + this._id);
	notify.error('Le site a été supprimé');
	model.mySites.websites.remove(this);
};

Website.prototype.createWebsite = function(){
	http().postJson('/pages', this).done(function(data){
		this.updateData(data);
	}.bind(this));
};

Website.prototype.saveModifications = function(){
	http().putJson('/pages/' + this._id, this);
	notify.info('Modifications enregistrées');
};

Website.prototype.save = function(){
	if(this._id){
		this.saveModifications();
	}
	else{
		this.createWebsite();
	}
};

Website.prototype.sync = function(){
	http().get('/pages/' + this._id).done(function(data){
		this.updateData(data);
	}.bind(this));
};

Website.prototype.toJSON = function(){
	return {
		title: this.title,
		pages: this.pages,
		icon: this.icon,
		landingPage: this.landingPage
	};
};

function Folder(params){
	this.collection(Website, {
		sync: function(){
			http().get('/pages/list/' + params.filter).done(function(websites){
				this.load(websites);
			}.bind(this));
		}
	})
}

model.build = function(){
	this.makeModels([Cell, Row, Page, Website, Folder]);

	this.mySites = new Folder({ filter: 'owner' });
	this.sharedSites = new Folder({ filter: 'shared' });
};