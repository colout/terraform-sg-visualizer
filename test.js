var myjson = jQuery.getJSON("http://localhost:8000/data.json", function(json){
  
  // Color pallett and a function to pop then cycle
  //   Using a fixed pallet increases contrast
  var colorPallet = {
    'pallet': [
      "#ee4035",
      '#f37736',
      '#fdf498',
      '#7bc043',
      '#0392cf'],
    'index': -1,
    'get': function() {
      this.index++;
      if (this.index >= this.pallet.length) this.index=0
      return (this.pallet[this.index]);
    }
  };

  var jsonTerraformSecurityGroups = myjson.responseJSON.resource.aws_security_group;
  var jsonTerraformSecurityGroupRules = myjson.responseJSON.resource.aws_security_group_rule;
  
  // Generate gojs-friendly json
  //////////////////////////////

  // json object for security group
  var jsonGoJSSecurityGroups = [];
  var jsonGoJSFromRules = [];
  var jsonGoJSToRules = [];
  var jsonGoJSCompositeRules = [];

  // Generate securitygroup json
  for(var name in jsonTerraformSecurityGroups) {
    if(jsonTerraformSecurityGroups.hasOwnProperty(name)) {
        var jsonObj = jsonTerraformSecurityGroups[name]

        var s = {};
        s.items = [] 

        s.title = name; 
        s.id = name; 
        s.isShadowed = true;
        s.icon = "sg.ico"
        //s.items.push( { "name": "name", "value": name } )

        var fieldList = ['']
        for (var i in fieldList) {
          s.items.push( { "name": fieldList[i], "value": jsonObj[fieldList[i]] } )
        }

        jsonGoJSSecurityGroups.push(s);
    }
  } 

  // Generate composite rules json 
  for(var name in jsonTerraformSecurityGroupRules) {
    if(jsonTerraformSecurityGroupRules.hasOwnProperty(name)) {
      var jsonObj = jsonTerraformSecurityGroupRules[name]
      if (jsonObj['type'] == 'ingress') {
        var s = {};
        s.meta = [] 

        // Generate the title of the 
      	var title = jsonObj['protocol']
      	if (jsonObj['to_port'] == jsonObj['from_port']) {
      		title = title + "/" + jsonObj['to_port']
      	}
      	else {
      		title = title + "/" + jsonObj['to_port'] + "-" + jsonObj['from_port']
      	}

        s.title = title;
        s.icon = "sg_rule.ico"

        s.id = title + " to " + removeSgInterpolation(jsonObj['security_group_id']); 
        s.isShadowed = false;

        var fieldList = ['protocol','from_port','to_port',"security_group_id"]
        for (var i in fieldList) {
          s.meta.push( { "name": fieldList[i], "value": jsonObj[fieldList[i]] } )
        }

        var already_exists = false;
      	for (var i in jsonGoJSCompositeRules) {
      		if (JSON.stringify(s) == JSON.stringify(jsonGoJSCompositeRules[i])) {
      			already_exists = true;
      		}
      	}
        if (!already_exists) {
        	jsonGoJSCompositeRules.push(s);
          
        	jsonGoJSToRules.push({"from": s.id, "to": removeSgInterpolation(jsonObj['security_group_id']), "lineColor": colorPallet.get()});
        }
      }
    }
  } 
        	console.log(jsonGoJSCompositeRules)

  // Generate from rules 
  for(var name in jsonTerraformSecurityGroupRules) {
    if(jsonTerraformSecurityGroupRules.hasOwnProperty(name)) {
      var jsonObj = jsonTerraformSecurityGroupRules[name]
      if (jsonObj['type'] == 'ingress') {
        var s = {};
        s.meta = [] 
        s.lineColor = colorPallet.get();

        // Generate the title of the 
      	var title = jsonObj['protocol']
      	if (jsonObj['to_port'] == jsonObj['from_port']) {
      		title = title + "/" + jsonObj['to_port']
      	}
      	else {
      		title = title + "/" + jsonObj['to_port'] + "-" + jsonObj['from_port']
      	}

      	// Set Metadata
        var fieldList = ['protocol','from_port','to_port',"security_group_id"]
        for (var i in fieldList) {
          s.meta.push( { "name": fieldList[i], "value": jsonObj[fieldList[i]] } )
        }

        // Set To
        jQuery.each(jsonGoJSCompositeRules, function(i,js){

        if(JSON.stringify(js.meta) == JSON.stringify(s.meta))
          s.to = js.id;
        });

      	// Set From
        if (jsonObj.self) {
          s.from = removeSgInterpolation(jsonObj['security_group_id']);
        }
        else {
          s.from = removeSgInterpolation(jsonObj['source_security_group_id']);
        }

        jsonGoJSFromRules.push(s);
      }
    }
  } 

  var jsonGoJS = {nodeDataArray: []}
  jsonGoJS.nodeDataArray = jsonGoJSSecurityGroups.concat(jsonGoJSCompositeRules)
  jsonGoJS.linkDataArray = jsonGoJSFromRules.concat(jsonGoJSToRules)
  jsonGoJS = jQuery.extend(jsonGoJS,{"nodeKeyProperty": "id"})
  console.log(jsonGoJS)


  // Graph settings
	var $ = go.GraphObject.make;
    myDiagram =
      $(go.Diagram, "myDiagramDiv",  // must name or refer to the DIV HTML element
        {
        	"toolManager.mouseWheelBehavior": go.ToolManager.WheelZoom,
          initialContentAlignment: go.Spot.Center,
          allowDelete: false,
          allowCopy: false,
          //layout: $(go.ForceDirectedLayout),

          layout: $(go.LayeredDigraphLayout, { 
          	layerSpacing: 200, 
          	columnSpacing: 10,
          	aggressiveOption: go.LayeredDigraphLayout.AggressiveMore,
          	//setsPortSpots: false,
            iterations: 10,
          	packOption: go.LayeredDigraphLayout.PackStraighten,
          	layeringOption: go.LayeredDigraphLayout.LayerLongestPathSource,
            cycleRemoveOption: go.LayeredDigraphLayout.CycleDepthFirst,
            initializeOption: go.LayeredDigraphLayout.InitDepthFirstIn,
          }),
          "undoManager.isEnabled": true
        });

  // Template for securitygroups
  var templSecurityGroup =
    $(go.Panel, "Horizontal",
      $(go.TextBlock,
	      { stroke: "black", font: "16px Consolas" },
        new go.Binding("text", "name")),
      $(go.TextBlock,
        { margin: 5, editable: true,font: "bold 16px Consolas" },
        new go.Binding("text", "value"))
    );

	// Generate nodes
	myDiagram.nodeTemplate =
	  $(go.Node, "Vertical",
      {        
				fromSpot: go.Spot.RightSide,  
        toSpot: go.Spot.LeftSide,
        isShadowed: false,
        background: "#f2f2f2" 
      },
	    new go.Binding("isShadowed", "isShadowed"),

	    // Icon
	    $(go.Picture,
	      { margin: 10, width: 50, height: 50, source: "sg_rule.ico" },
	      new go.Binding("source", "icon")),

	    // Title
	    $(go.TextBlock,
	      { margin: 3, stroke: "black", font: "bold 16px sans-serif", alignment: go.Spot.Center },
	      new go.Binding("text", "title")),

	    // The data
      $(go.Panel, "Table",
        {
          maxSize: new go.Size(100, 999),
          margin: 5,
          defaultAlignment: go.Spot.Left
        },
        $(go.RowColumnDefinition, { column: 2, width: 4 }),
        
        // Generate the table
          $(go.Panel, "Vertical",
            {
              name: "LIST",
              row: 1,
              padding: 1,
              alignment: go.Spot.TopLeft,
              defaultAlignment: go.Spot.Left,
              stretch: go.GraphObject.Horizontal,
              itemTemplate: templSecurityGroup,
            },
            new go.Binding("itemArray", "items").makeTwoWay()),
          )
	  );



    myDiagram.linkTemplate =
      $(go.Link,
        { routing: go.Link.Orthogonal, curve: go.Link.JumpGap },
        $(go.Shape, { isPanelMain: true, stroke: "White", strokeWidth: 8 }),
        $(go.Shape, { isPanelMain: true, stroke: "Black", strokeWidth: 5 }),
        $(go.Shape, { isPanelMain: true, stroke: "Orange", strokeWidth: 3 }, new go.Binding("stroke", "lineColor")),
        $(go.Shape, 
          { toArrow: "Standard", scale: 2,  stroke: "Black", fill: "Orange" }, new go.Binding("fill", "lineColor")),
      );

  // Draw it
	myDiagram.model =  go.Model.fromJson(JSON.stringify(jsonGoJS));
	//myDiagram.model = new go.GraphLinksModel(nodeDataArray, linkDataArray);

  console.log(colorPallet.get())
  console.log(colorPallet.get())
  console.log(colorPallet.get())

});

function removeSgInterpolation (s) {
  var myRegexp = /^\$\{aws_security_group.(.*).id\}$/g;
  var match = myRegexp.exec(s);
  return match[1];
}
