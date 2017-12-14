(function() {
	if (window.mingy_addon) {
		return;
	}

	var aliases = new Map();
	aliases.set('l', 'look');
	aliases.set('i', 'items');
	aliases.set('k', 'kill');
	aliases.set('e', 'east');
	aliases.set('s', 'south');
	aliases.set('w', 'west');
	aliases.set('n', 'north');
	aliases.set('se', 'southeast');
	aliases.set('sw', 'southwest');
	aliases.set('ne', 'northeast');
	aliases.set('nw', 'northwest');
	aliases.set('u', 'up');
	aliases.set('d', 'down');
	aliases.set('h', 'halt');
	aliases.set('dz', 'dazuo');
	aliases.set('pfm', 'perform');

	var map_ids = new Map();
	map_ids.set('yangzhou', '0');
	map_ids.set('yz', '0');
	map_ids.set('wudang', '1');
	map_ids.set('wd', '1');
	map_ids.set('shaolin', '2');
	map_ids.set('sl', '2');
	map_ids.set('huashan', '3');
	map_ids.set('hs', '3');
	map_ids.set('emei', '4');
	map_ids.set('em', '4');
	map_ids.set('xiaoyao', '5');
	map_ids.set('xy', '5');
	map_ids.set('gaibang', '6');
	map_ids.set('gb', '6');
	map_ids.set('xiangyang', '7');
	map_ids.set('xy2', '7');
	map_ids.set('wudaota', '8');
	map_ids.set('wdt', '8');

	var message_listeners = [];
	var listener_seq = 0;
	function add_listener(types, fn) {
		var listener = {
			'id' : ++listener_seq,
			'types' : types,
			'fn' : fn
		};
		message_listeners.push(listener);
		return listener.id;
	}
	function remove_listener(id) {
		for ( var i = 0; i < message_listeners.length; i++) {
			if (message_listeners[i].id == id) {
				message_listeners.splice(i, 1);
			}
		}
	}
	var _receive_data = window.ReceiveData;
	window.ReceiveData = function(data) {
		_receive_data.apply(this, arguments);
		for ( var i = 0; i < message_listeners.length; i++) {
			var listener = message_listeners[i];
			if (listener.type == data.type || (listener.type instanceof Array && $
							.inArray(data.type, listener.type) >= 0)) {
				listener.fn(data);
			}
		}
	};
	var _receive_message = window.ReceiveMessage;
	window.ReceiveMessage = function(msg) {
		_receive_message.apply(this, arguments);
		for ( var i = 0; i < message_listeners.length; i++) {
			var listener = message_listeners[i];
			if (listener.type == 'msg' || (listener.type instanceof Array && $
							.inArray('msg', listener.type) >= 0)) {
				listener.fn({'type' : 'msg', 'msg' : msg});
			}
		}
	};
	
	var task_h_timer, task_h_listener;
	function stop_task() {
		if (task_h_timer) {
			clearInterval(task_h_timer);
			task_h_timer = undefined;
			console.log('task stopped.');
		} else if (task_h_listener) {
			remove_listener(task_h_listener);
			task_h_listener = undefined;
			console.log('task stopped.');
		}
	}
	function add_task_timer(fn, interval) {
		stop_task();
		task_h_timer = setInterval(fn, interval);
	}
	function add_task_listener(types, fn) {
		stop_task();
		task_h_listener = add_listener(types, subtype);
	}

	function execute_cmd(cmd) {
		if (cmd.substr(0, 6) == '#loop ') {
			cmd = $.trim(cmd.substr(6));
			if (cmd) {
				var interval = 500;
				var i = cmd.indexOf(' ');
				if (i >= 0) {
					var t = parseInt(cmd.substr(0, i));
					if (!isNaN(t)) {
						interval = t;
						cmd = $.trim(cmd.substr(i + 1));
					}
				}
				if (cmd) {
					stop_task();
					console.log('starting loop...');
					var pc;
					add_task_timer(function() {
						if (!pc) {
							pc = process_cmdline(cmd);
						}
						if (pc) {
							send_cmd(pc);
						}
					}, interval);
				}
			}
		} else if (cmd == '#stop') {
			stop_task();
		} else if (cmd.substr(0, 7) == '#alias ') {
			var alias = $.trim(cmd.substr(7));
			var key, value, i = alias.indexOf(' ');
			if (i >= 0) {
				key = $.trim(alias.substr(0, i));
				value = $.trim(alias.substr(i + 1));
			} else {
				key = alias;
				value = '';
			}
			if (value) {
				if (value != aliases.get(key)) {
					aliases.set(key, value);
					console.log("set alias ok.");
				}
			} else {
				if (aliases.has(key)) {
					aliases.delete(key);
					console.log("alias removed.");
				}
			}
		} else if (cmd.substr(0, 1) == '#') {
			var i = cmd.indexOf(' ');
			if (i >= 0) {
				var times = parseInt(cmd.substr(1, i - 1));
				if (!isNaN(times)) {
					cmd = $.trim(cmd.substr(i + 1));
					for ( var j = 0; j < times; j++) {
						execute_cmd(cmd);
					}
				}
			}
		} else if (cmd) {
			var pc = process_cmdline(cmd);
			if (pc) {
				send_cmd(pc);
			}
		}
	}
	function process_cmdline(line) {
		var pc = '';
		var arr = line.split(';');
		for ( var i = 0; i < arr.length; i++) {
			var cmd = $.trim(arr[i]);
			if (cmd) {
				var c = process_cmd(cmd);
				if (c) {
					if (pc) {
						pc += ';';
					}
					pc += c;
				}
			}
		}
		return pc;
	}
	function process_cmd(cmd) {
		var args = [ '', '' ];
		var i = cmd.indexOf(' ');
		if (i >= 0) {
			args[0] = $.trim(cmd.substr(0, i));
			args[1] = $.trim(cmd.substr(i + 1));
		} else {
			args[0] = cmd;
		}
		var alias = aliases.get(args[0]);
		if (alias) {
			var line = alias;
			if (args[1]) {
				line += ' ' + args[1];
			}
			return process_cmdline(line);
		}
		translate(args);
		var pc = '';
		if (args[0]) {
			if (pc) {
				pc += ';';
			}
			if (args[1]) {
				pc += args[0] + ' ' + args[1];
			} else {
				pc += args[0];
			}
		}
		return pc;
	}
	function translate(args) {
		if (args[0] == 'look') {
			if (!args[1]) {
				args[0] = 'golook_room';
			} else {
				var target = find_target(args[1]);
				if (target) {
					if (target[2] == 'npc') {
						args[0] = 'look_npc';
						args[1] = target[0];
					} else if (target[2] == 'item') {
						args[0] = 'look_item';
						args[1] = target[0];
					} else {
						args[0] = 'score';
						args[1] = target[0];
					}
				} else {
					arg[0] = '';
				}
			}
		} else if (args[0] == 'fight' || args[0] == 'watch') {
			if (args[0] == 'watch') {
				args[0] = 'watch_vs';
			}
			var target = find_target(args[1], [ 'npc', 'user' ]);
			if (target) {
				args[1] = target[0];
			}
		} else if (args[0] == 'kill' || args[0] == 'ask' || args[0] == 'give'
				|| args[0] == 'buy') {
			var target = find_target(args[1], [ 'npc' ]);
			if (target) {
				args[1] = target[0];
			}
		} else if (args[0] == 'get') {
			var target = find_target(args[1], [ 'item' ]);
			if (target) {
				args[1] = target[0];
			}
		} else if (args[0] == 'east' || args[0] == 'south' || args[0] == 'west'
				|| args[0] == 'north' || args[0] == 'southeast'
				|| args[0] == 'southwest' || args[0] == 'northeast'
				|| args[0] == 'northwest' || args[0] == 'up'
				|| args[0] == 'down') {
			args[1] = args[0];
			args[0] = 'go';
		} else if (args[0] == 'fly') {
			args[0] = 'jh';
			var id = map_ids.get(args[1]);
			if (id) {
				args[1] = id;
			}
			args[1] = 'fam ' + args[1] + " start";
		} else if (args[0] == 'halt') {
			args[0] = 'stopstate';
			args[1] = '';
		} else if (args[0] == 'heal') {
			args[0] = 'liaoshang';
			args[1] = '';
		}
	}
	function send_cmd(cmd) {
		SendCommand(cmd);
	}
	
	var cmdline = $('<input style="width: 100%;">');
	$('.content-bottom').after(cmdline);
	var history_cmds = [];
	var select_index = -1;
	cmdline.keydown(function(e) {
		if (e.which == 13) { // ENTER
			cmdline.select();
			cmdline.focus();
			send_command();
			e.preventDefault();
		} else if (e.which == 38) { // UP
			if (select_index > 0) {
				cmdline.val(history_cmds[--select_index]);
				cmdline.select();
				cmdline.focus();
				e.preventDefault();
			}
		} else if (e.which == 40) { // DOWN
			if (select_index < history_cmds.length - 1) {
				cmdline.val(history_cmds[++select_index]);
				cmdline.select();
				cmdline.focus();
				e.preventDefault();
			}
		}
	});
	function send_command() {
		var cmd = $.trim(cmdline.val());
		if (cmd == '') {
			return;
		}
		if (history_cmds.length == 0
				|| history_cmds[history_cmds.length - 1] != cmd) {
			history_cmds.push(cmd);
			if (history_cmds.length > 20) {
				history_cmds = history_cmds.slice(-20);
			}
		}
		execute_cmd(cmd);
	}
	$(document).keydown(
			function(e) {
				if (e.which == 112) { // F1
					SendCommand('eq 9wow13462cb;perform force.xi;perform dodge.power;perform sword.wu');
					e.preventDefault();
				} else if (e.which == 113) { // F2
					SendCommand('eq zsko12f23aa;perform force.xi;perform dodge.power;perform blade.chan;eq 9wow13462cb');
					e.preventDefault();
				} else if (e.which == 114) { // F3
					SendCommand('perform force.xi;perform dodge.power;eq vfi2158ba5c;perform whip.chan;eq 9wow13462cb');
					e.preventDefault();
				} else if (e.which == 115) { // F4
					SendCommand('eq 9wow13462cb;perform force.xi;perform sword.poqi');
					e.preventDefault();
				} else if (e.which == 118) { // F7
					SendCommand('eq iq8b15a9c27;eq o90j1582bc7;eq powh1516cbd;eq 9f1k1560253;eq sg9w14d7dca;eq x6e51518454');
					e.preventDefault();
				} else if (e.which == 119) { // F8
					SendCommand('eq 603z155852b;eq cd9r156c5c0;eq 38hd14d7d37;eq q0ui10f5a1d;eq lhc313bbbf4;eq buhp157ff22');
					e.preventDefault();
				} else if (e.which == 120) { // F9
					SendCommand('jh fam 0 start;go west;go west;go north;go enter;go west;lianxi yunlongbian');
					e.preventDefault();
				} else if (e.which == 121) { // F10
					SendCommand('jh fam 0 start;go west;go west;go west;go west;eq dkdi128460d;wa');
					e.preventDefault();
				} else if (e.which == 97) {
					SendCommand('go southwest');
				} else if (e.which == 98) {
					SendCommand('go south');
				} else if (e.which == 99) {
					SendCommand('go southeast');
				} else if (e.which == 100) {
					SendCommand('go west');
				} else if (e.which == 102) {
					SendCommand('go east');
				} else if (e.which == 103) {
					SendCommand('go northwest');
				} else if (e.which == 104) {
					SendCommand('go north');
				} else if (e.which == 105) {
					SendCommand('go northeast');
				} else if (!e.isDefaultPrevented() && e.which == 13) { // ENTER
					if (history_cmds.length > 0) {
						select_index = history_cmds.length - 1;
						cmdline.val(history_cmds[select_index]);
						cmdline.select();
						cmdline.focus();
					} else {
						cmdline.val('');
						cmdline.focus();
					}
					e.preventDefault();
				}
				return true;
			});
	window.mingy_addon = 1;
	ReceiveMessage('<red>addon loaded</red>');
})();