app.controller('biermanCtrl', function($scope, BiermanRest) {

	// BIER Manager configuration
	$scope.appConfig = {
		// FOR MANUAL CONFIGURATION
		'proxyHost': 'localhost', // IP address of controller
		'proxyPort': '5555', // Port of controller (8181 by default)
		'httpMaxTimeout': 10000, // Maximum timeout in milliseconds for HTTP requests
		'maxPacketLoss': 10,
		// DO NOT MODIFY CONFIGURATION BELOW
		'mode': 'init', // Application mode (do not modify)
		'topoInitialized': false,
		'currentPanel': null,
		'currentTopologyId': null
	};

	var biermanRest = new BiermanRest($scope.appConfig);

	// Topology data in Common Topology Model style
	$scope.topologyData = {
		'nodes': [],
		'links': []
	};

	$scope.clearCurrentTree = function(){
		$scope.currentTree = {
			'ingress': null,
			'egress': [],
			'links': []
		};
	};

	$scope.initApp = function(){
		$scope.clearCurrentTree();
		biermanRest.loadTopology(function(data){
			$scope.processTopologyData(data);
			$scope.topoInitialized = true;
			$scope.appConfig.currentTopologyId = data['topology-id'];
			console.log($scope.topologyData);
		}, function(errMsg){
			console.error(errMsg);
		});

	};

	$scope.computeMask = function(){
		var input = {};
		var ingress = $scope.topo.getNode($scope.currentTree.ingress);

		if($scope.appConfig.currentTopologyId && ingress != undefined && ingress != null){
			input = {
				'topo-id': $scope.appConfig.currentTopologyId,
				'node-id': ingress.model()._data.nodeId,
				'link': []
			};

			for(var i = 0; i < $scope.currentTree.links.length; i++){
				var currentLink = $scope.topo.getLink($scope.currentTree.links[i]);
				if(currentLink){
					input.link.push({'link': currentLink.model()._data.links[0].linkId});
				}
				else{
					console.warn("Hey, I didn't find a link you were trying to submit...");
				}
			}

			console.log(input);

			biermanRest.computeMask(input,
				// success callback
				function(response){
					console.log(response);
				},
				// error callback
				function(errMsg){
					console.error(errMsg);
				}
			);
		}
		else{
			console.warn('No ingress set at the moment');
		}
	};

	$scope.processTopologyData = function(data){
		console.log(data);

		function getKey(a, b){
			if(a < b)
				return a + '-' + b;
			else
				return b + '-' + a;
		}

		var topologyData = {
			nodes: [],
			links: [],
			// external id -> internal id
			nodesDict: new nx.data.Dictionary({}),
			linksDict: new nx.data.Dictionary({})
		};
		data.node.forEach(function(currentNode,index,nodes){
			// Reformat information
			var node = {};
			// Internal ID
			node.id = index;
			// Global ID
			node.nodeId = currentNode['node-id'];
			// BFR local id
			node.bfrLocalId = currentNode['topology-bier:bfr-local-id'];
			// Router ID
			node.routerId = currentNode['topology-bier:router-id'];
			// Termination points information
			node.tp = currentNode['termination-point'];
			// Attributes
			node.attributes = currentNode['l3-unicast-igp-topology:igp-node-attributes'];

			// Assign node's external id to the internal one
			topologyData.nodesDict.setItem(node.nodeId, node.id);
			// Record node data
			topologyData.nodes.push(node);
		});



		for(var linkIndex = 0; linkIndex < data.link.length; linkIndex++){
			var srcId = topologyData.nodesDict.getItem(data.link[linkIndex].source['source-node']);
			var tarId = topologyData.nodesDict.getItem(data.link[linkIndex].destination['dest-node']);
			var currentLinkKey = getKey(srcId,tarId);
			var currentLink = data.link[linkIndex];
			var linkContainer = {};
			var linkContainerIndex = null;
			var linkInfo;


			if(topologyData.linksDict.contains(currentLinkKey)){
				linkContainerIndex = topologyData.linksDict.getItem(getKey(srcId,tarId));
			}
			else{
				linkContainerIndex = topologyData.links.length;
				topologyData.linksDict.setItem(getKey(srcId,tarId), linkContainerIndex);
				topologyData.links.push({
					id: linkContainerIndex,
					source: Math.min(srcId, tarId),
					target: Math.max(srcId, tarId),
					links: []
				});
				linkContainer = topologyData.links[linkContainerIndex];
				linkInfo = {
					// Internal ID
					id: linkIndex,
					// Global ID
					linkId: currentLink['link-id'],
					// Source node ID
					source: topologyData.nodesDict.getItem(currentLink['source']['source-node']),
					// Target node ID
					target: topologyData.nodesDict.getItem(currentLink['destination']['dest-node']),
					// Source TP name
					sourceTP: currentLink['source']['source-tp'],
					// Target TP name
					targetTP: currentLink['destination']['dest-tp'],
					// BFR adjustment ID
					bfrAdjId: currentLink['topology-bier:bfr-adj-id'],
					// Delay of a link
					delay: currentLink['topology-bier:delay'],
					// Loss info
					loss: currentLink['topology-bier:loss'],
					// Attributes
					attributes: currentLink['l3-unicast-igp-topology:igp-link-attributes']
				};
				linkContainer.links.push(linkInfo);
			}
		}

		$scope.topologyData = topologyData;
		return $scope.topologyData;
	};

	// panels
	$scope.openNodePanel = function(){
		$scope.openNodePanelTopo();
	};

	$scope.openLinkPanel = function(){
		$scope.openLinkPanelTopo();
	};

	$scope.openFlowPanel = function(){
		$scope.openFlowPanelTopo();
	};

	$scope.initApp();
});