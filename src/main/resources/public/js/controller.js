routes.define(function($routeProvider){
	$routeProvider
		.when('/website/:siteId/list-pages', {
			action: 'listPages'
		})
		.when('/website/:siteId', {
			action: 'viewSite',
			reloadOnSearch: false
		})
		.when('/website/:siteId/:pageLink', {
			action: 'viewPage',
			reloadOnSearch: false
		})
		.when('/website/:siteId/edit/:pageLink', {
			action: 'editPage'
		})
		.when('/list-sites', {
			action: 'listSites',
			reloadOnSearch: false
		})
		.otherwise({
			redirectTo: '/list-sites'
		});
});

function PagesController($scope, template, route, model, date, $location, $timeout, $rootScope){
	$scope.websites = model.websites;
	$scope.localAdmin = model.localAdmin;
	$scope.lang = lang;
	$scope.template = template;
	$scope.date = date;
	$scope.display = {
		guideCols: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12],
		guideRows: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12],
		showEditButtons: true,
		search: '',
		mineOnly: false,
		publicSites: false,
		snipletStep: 1,
		maxResults: 5,
		maxEdit: 5
	};

	$rootScope.$on('share-updated', function(event, changes){
		if(template.contains('main', 'websites-list')){
			model.websites.selection().forEach(function(website){
				website.saveModifications(function(){
					website.sync(function(){
						website.synchronizeRights();
					});
				});
			});
		}
		else{
			$scope.website.saveModifications(function(){
				$scope.website.sync(function(){
					$scope.website.synchronizeRights();
				});
			});
		}

	});

	sniplets.load(function(){
		$scope.sniplets = sniplets.sniplets;
	});

	$scope.website = new Website();
	$scope.page = new Page();
	$scope.newCell = new Cell();

	template.open('grid', 'grid');
	template.open('grid-view', 'grid-view');
	template.open('publish', 'publish');

	function viewPage(siteId, pageLink){
		if(pageLink && pageLink[0] === ':'){
			pageLink = $scope[pageLink.split(':')[1]];
		}
		if($scope.website._id){
			if($scope.website.pages.length() === 0 && $scope.website.myRights.update){
				template.open('main', 'website-manager');
				template.open('edit-view', 'pages-list');
				$scope.page = new Page();
			}
			else{
				$scope.snipletResource = $scope.website;
				$scope.page = $scope.website.pages.findWhere({ 'titleLink': pageLink || $scope.website.landingPage });
				template.open('main', 'page-viewer');
			}

		} else {
			model.websites.one('sync', function(){
				var website = model.websites.findWhere({ '_id': siteId });
				if(website === undefined){
					return;
				}
				if(website.pages.length() === 0 && website.myRights.update){
					template.open('main', 'website-manager');
					template.open('edit-view', 'pages-list');
					$scope.page = new Page();
				}
				else{
					$scope.website = website;
					$scope.snipletResource = website;
					$scope.page = $scope.website.pages.findWhere({ 'titleLink': pageLink || $scope.website.landingPage });
					template.open('main', 'page-viewer');
				}
			});
		}
	}

	route({
		listSites: function(){
			template.open('main', 'websites-list');
		},
		viewSite: function(params){
			if($scope.website._id === params.siteId){
				location.replace(window.location.hash + '/' + $scope.website.landingPage);
				viewPage($scope.website._id, $scope.website.landingPage);
			}
			else{
				model.websites.one('sync', function(){
					var website = model.websites.findWhere({ '_id': params.siteId });
					$scope.website = website;

					location.replace(window.location.hash + '/' + $scope.website.landingPage);
					viewPage($scope.website._id, $scope.website.landingPage);
				});
			}
		},
		listPages: function(params){
			template.open('main', 'website-manager');
			template.open('edit-view', 'pages-list');
			if($scope.website._id !== params.siteId){
				model.websites.one('sync', function(){
					var website = model.websites.findWhere({ '_id': params.siteId });
					$scope.website = website;

				});
			}
		},
		viewPage: function(params){
			viewPage(params.siteId, params.pageLink);
		},
		editPage: function(params){
			viewPage(params.siteId, params.pageLink);
			$scope.editPage($scope.page);
		}
	});

	$scope.searchMatch = function(element){
		var filters = (!$scope.display.mineOnly || element.owner.userId === model.me.userId) && ($scope.display.publicSites || element.visibility !== 'PUBLIC')
		return !element.hideInPages && filters && (!$scope.display.search.trim() ?
				true :
				(lang.removeAccents((element.title || '').toLowerCase()).indexOf(lang.removeAccents($scope.display.search.toLowerCase())) !== -1));
	};

	$scope.cancelSniplet = function(){
		$scope.display.selectSniplet = false;
		$scope.display.snipletStep = 1;
	};

	$scope.viewSite = function(site){
		$scope.website = site;
		$scope.snipletResource = $scope.website;
		$scope.page = site.pages.findWhere({ 'titleLink': site.landingPage });
		template.open('main', 'page-viewer');
		$location.path('/website/' + $scope.website._id);
	};

	$scope.cancelEdit = function(){
		$scope.page = new Page();
		$scope.website.sync();
		template.open('main', 'website-manager');
		template.open('edit-view', 'pages-list');
	};

	$scope.removeWebsites = function(){
		model.websites.removeSelection();
		$scope.website = new Website();
		$scope.display.showConfirmRemove = false;
	};

	$scope.openRemoveConfirm = function(site){
		$scope.display.showConfirmRemove = true;
		$scope.website = site;
	};

	$scope.createSite = function(){
		if(!$scope.website.title){
			notify.error('site.empty.title');
			return;
		}

		$scope.page = new Page();
		$scope.display.createNewSite = false;
		$scope.website.save(function(){
			if($scope.website.visibility === 'PUBLIC'){
				$scope.website.markups = {};
				$scope.website.markups.view = [
					{
						href: '/pages#/list-sites',
						label: 'pages.marker.websites',
						resourceRight: 'read'
					},
					{
						href: '#/website/' + $scope.website._id + '/edit/:page.titleLink',
						label: 'edit',
						resourceRight: 'update'
					},
					{
						href: '/pages#/website/' + $scope.website._id + '/list-pages',
						label: 'pages.marker.nav',
						resourceRight: 'update'
					}
				];
				$scope.website.markups.edit = [
					{
						href: '/pages#/list-sites',
						label: 'pages.marker.websites',
						resourceRight: 'read'
					},
					{
						href: '#/website/' + $scope.website._id + '/:page.titleLink',
						label: 'pages.marker.preview',
						resourceRight: 'read'
					},
					{
						href: '/pages#/website/' + $scope.website._id + '/list-pages',
						label: 'pages.marker.nav',
						resourceRight: 'update'
					}
				];
			}
			$scope.website.save();
		});
		$scope.snipletResource = $scope.website;
		template.open('main', 'website-manager');
		template.open('edit-view', 'website-properties');
	};

	$scope.editWebsiteProperties = function(){
		$scope.website = model.websites.selection()[0];
		$scope.snipletResource = $scope.website;

		$scope.page = new Page();
		template.open('main', 'website-manager');
		template.open('edit-view', 'website-properties');
	};

	$scope.saveProperties = function(){
		$scope.website.save(function(){
			$scope.website.updateApplication();
			$scope.home()
		});
	};

	$scope.editWebsitePages = function(){
		$scope.website = model.websites.selection()[0];
		$scope.snipletResource = $scope.website;

		$scope.page = new Page();
		template.open('main', 'website-manager');
		template.open('edit-view', 'pages-list');
	};

	$scope.switchSelectAllPages = function(){
		if($scope.display.selectAllPages){
			$scope.website.pages.selectAll();
		}
		else{
			$scope.website.pages.deselectAll();
		}
	};

	$scope.cancelPageCreation = function(){
		$scope.display.createNewPage = false;
		$scope.page = new Page();
	};

	$scope.createPage = function(templateName){
		if(!$scope.page.title){
			notify.error('page.needs.title');
			return;
		}
		if($scope.website.pages.findWhere({ title: $scope.page.title })){
			notify.error('page.already.exists');
			return;
		}
		$scope.page.useTemplate($scope.website, templateName);
		$scope.page.titleLink = encodeURIComponent(lang.removeAccents($scope.page.title.replace(/\ /g, '-').replace(/:/g, '-').replace(/\?/g, '')).toLowerCase());
		$scope.website.pages.push($scope.page);
		if($scope.website.pages.length() === 1){
			$scope.website.landingPage = $scope.page.titleLink;
		}
		$scope.website.save();
		$scope.display.createNewPage = false;
		template.open('main', 'page-editor');
		window.location.hash = '/website/' + $scope.website._id + '/' + $scope.page.titleLink;
		$scope.page = new Page();
	};

	$scope.rename = function(){
		$scope.display.rename = false;
		$scope.website.pages.selection()[0].title = $scope.display.newTitle;
		$scope.website.save();
		setTimeout(function(){
			$scope.display.newTitle = '';
		}, 500);
	};

	$scope.duplicate = function(){
		$scope.page.titleLink = encodeURIComponent(lang.removeAccents($scope.page.title.replace(/\ /g, '-').replace(/:/g, '-').replace(/\?/g, '')).toLowerCase());
		$scope.page.rows.load(JSON.parse(JSON.stringify($scope.website.pages.selection()[0].rows)));
		$scope.website.pages.push($scope.page);
		$scope.website.save();
		$scope.display.duplicate = false;
		setTimeout(function(){
			$scope.page = new Page();
		}, 500);
	};

	$scope.editPage = function(page){
		$scope.page = page;
		template.open('main', 'page-editor');
		$scope.display.editGrid = page;
	};

	$scope.removeCell = function(row, cell){
		row.cells.remove(cell);
		if(row.cells.length() === 0){
			$scope.page.rows.remove(row);
		}
	};

	$scope.setType = function(cell, type){
		cell.media.type = type;
		if(type === 'grid'){
			cell.buildSubGrid();
			$scope.display.editGrid = cell.media.source;
		}
		if(type === 'video'){
			cell.media.source = cell.media.source.replace('http://', 'https://');
			if(cell.media.source.indexOf('youtube') !== -1){
				var sourceSplit = cell.media.source.split('" frame');
				sourceSplit[0] += '?wmode=transparent';
				cell.media.source = sourceSplit.join('" frame');
			}
			cell.height = 6;
		}
		if(type === 'text'){
			cell.media.source = '<p>Entrez ici votre texte... </p>'
		}
	};

	$scope.addCell = function(row){
		if(!row.addCell($scope.newCell)){
			$scope.page.addRowAt(row).addCell($scope.newCell);
		}
		$scope.newCell = new Cell();
	};

	$scope.sniplet = {};

	$scope.selectSnipletSource = function(template, application){
		$scope.sniplet = {
			template: template,
			application: application
		};
		$scope.display.snipletStep = 2;
	};

	$scope.addSniplet = function(cell){
		cell.media.type = 'sniplet';
		cell.media.source = {
			template: $scope.sniplet.template,
			application: $scope.sniplet.application,
			source: $scope.sniplet.source
		};
		$scope.display.snipletStep = 1;
		$scope.display.selectSniplet = false;
	};

	$scope.setRow = function(cell, rowIndex){
		$scope.display.editGrid.moveCell(cell, rowIndex);
	};

	$scope.home = function(){
		$scope.website = new Website();
		model.websites.sync();
		template.open('main', 'websites-list');
		$location.path('/list-sites');
	};

	$scope.removeSelectedPages = function(){
		$scope.website.pages.removeSelection();
		$scope.website.save();
	};

	$scope.setLandingPage = function(){
		$scope.website.landingPage = $scope.website.pages.selection()[0].titleLink;
		notify.info('landingPage.changed');
		$scope.website.save();
	};

	$scope.editGrid = function(page, event){
		if(!page || event.target.className.indexOf('cke') !== -1 || template.contains('main', 'page-viewer') || !page.rows){
			return;
		}
		$scope.display.editGrid = page;
		event.stopPropagation();
	};

	$scope.cancelSiteCreation = function(){
		$scope.display.createNewSite = false;
		$scope.website = new Website();
	};

	$scope.pagePreview = function(){
		template.open('main', 'page-viewer');
		$scope.display.editGrid = undefined;
		$scope.display.preview = true;
		$scope.website.save();
	};

	$scope.cancelView = function(){
		if($scope.display.preview){
			template.open('main', 'page-editor');
		}
		else{
			template.open('main', 'websites-list');
		}
		$scope.display.preview = false;
	};

	$scope.closeWebsite = function(){
		$scope.website = new Website();
		$location.path('/');
		model.websites.sync();
	};

	$scope.redirect = function(path){
		$location.path(path.href.split('#')[1]);
		model.websites.sync();
	};

	$scope.saveModifications = function(){
		$timeout(function(){
			$scope.website.save();
		}, 500);
	};

	$scope.openPublish = function(){
		if(template.contains('main', 'websites-list')){
			$scope.website = model.websites.selection()[0];
		}
		$scope.display.showPublish = true;
		model.localAdmin.structures.sync();
	};

	$scope.matchSearch = function(element){
		return $scope.display.searchGroups
				&& lang.removeAccents(element.name.toLowerCase()).indexOf(lang.removeAccents($scope.display.searchGroups.toLowerCase())) !== -1
				&& ($scope.website.published === undefined || !_.findWhere($scope.website.published[element.structureId].groups, { id: element.id }));
	};

	$scope.publishForGroup = function(structure, group){
		$scope.website.publish(structure, group);
	};

	$scope.isLocalAdmin = function(){
		return model.me.functions["ADMIN_LOCAL"]
	}

	$scope.showPublishLabel = function(){
		$scope.showLabel = true
	}
}
