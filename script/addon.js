(function() {
	if (window.mingy_addon) {
		return;
	}

	var aliases = new Map();
	aliases.set('l', 'look');
	aliases.set('i', 'items');
	aliases.set('cha', 'skills');
	aliases.set('msg', 'message');
	aliases.set('rank', 'stats');
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
	aliases.set('home', 'fly yz;w;w;n;enter');
	aliases.set('full', 'fly yz;n;n;w;eq 9wow13462cb;heal');
	aliases.set('yamen', 'fly yz;w;n;n');
	aliases.set('p1', 'eq 9wow13462cb;perform force.xi;perform dodge.power;perform sword.wu');
	aliases.set('p2', 'eq jnk618b6c80;perform force.xi;perform dodge.power;perform blade.chan');
	aliases.set('p3', 'perform force.xi;perform dodge.power;perform sword.wu;perform unarmed.chan');
	aliases.set('p4', 'eq a3gg1689bd4;perform force.xi;perform whip.chan');
	aliases.set('p5', 'eq 9wow13462cb;perform force.xi;perform sword.poqi');

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
	
	var full_skills = ['sword', 'parry', 'dugujiujian', 'unarmed', 'dasongyangshenzhang',
	                   'force', 'zixiashengong2', 'whip', 'yunlongbian', 'dodge', 'tagexing',
	                   'blade', 'wuhuduanmendao', 'throwing', 'jinshezhui', 'club', 'baguagun'];
	var no_loot = false;
	var cooldowns = new Map();

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
	var _receive_data = GameClient.OnData;
	GameClient.OnData = function(data) {
		_receive_data.apply(this, arguments);
		for ( var i = 0; i < message_listeners.length; i++) {
			var listener = message_listeners[i];
			if (listener.types == data.type || (listener.types instanceof Array && $
							.inArray(data.type, listener.types) >= 0)) {
				listener.fn(data);
			}
		}
	};
	var _receive_message = GameClient.OnMessage;
	GameClient.OnMessage = function(msg) {
		_receive_message.apply(this, arguments);
		for ( var i = 0; i < message_listeners.length; i++) {
			var listener = message_listeners[i];
			if (listener.types == 'text' || (listener.types instanceof Array && $
							.inArray('text', listener.types) >= 0)) {
				listener.fn({'type' : 'text', 'msg' : msg});
			}
		}
	};
	function log(msg) {
		ReceiveMessage('<hir>' + msg + '</hir>');
	}
	
	var my_id, room, items = new Map(), in_combat = false, i_am_ready = true, i_am_busy = false, combat_room, kill_targets = [], auto_loot_timeout;
	add_listener(['login', 'room', 'items', 'itemadd', 'itemremove', 'combat', 'text', 'dispfm', 'status'], function(data) {
		if (data.type == 'login') {
			my_id = data.id;
		} else if (data.type == 'room') {
			room = data;
		} else if (data.type == 'items') {
			items = new Map();
			for (var i = 0; i < data.items.length; i++) {
				var name = get_name(data.items[i].name);
				items.set(data.items[i].id, name);
				if (room.path == combat_room && kill_targets.length > 0) {
					auto_loot(data.items[i].id, name);
				}
			}
		} else if (data.type == 'itemadd') {
			var name = get_name(data.name);
			items.set(data.id, name);
			if (room.path == combat_room && kill_targets.length > 0) {
				auto_loot(data.id, name);
			}
		} else if (data.type == 'itemremove') {
			items.delete(data.id);
		} else if (data.type == 'combat') {
			if (data.start) {
				in_combat = true;
				combat_room = room.path;
				kill_targets = [];
				if (auto_loot_timeout) {
					clearTimeout(auto_loot_timeout);
					auto_loot_timeout = undefined;
				}
			} else if (data.end) {
				in_combat = false;
				auto_loot_timeout = setTimeout(function() {
					kill_targets = [];
					auto_loot_timeout = undefined;
				}, 120000);
			}
		} else if (data.type == 'text') {
			if (in_combat) {
				var r = get_text(data.msg).match(/^看起来(.+)想杀死你！$/);
				if (r) {
					kill_targets.push(r[1]);
				}
			}
		} else if (data.type == 'dispfm') {
			if (data.rtime) {
				i_am_ready = false;
				setTimeout(function() {
					i_am_ready = true;
				}, data.rtime);
			}
			if (data.id && data.distime) {
				cooldowns.set(data.id, true);
				setTimeout(function() {
					cooldowns.set(data.id, false);
				}, data.distime);
			}
		} else if (data.type == 'status') {
			if (data.id == my_id && data.sid == 'busy') {
				if (data.action == 'add') {
					i_am_busy = true;
				} else if (data.action == 'remove') {
					i_am_busy = false;
				}
			}
		}
	});
	function get_text(str) {
		return $.trim($('<body>' + str + '</body>').text());
	}
	function get_name(name_str) {
		var name = get_text(name_str);
		var i = name.lastIndexOf(' ');
		if (i >= 0) {
			name = name.substr(i + 1).replace(/<.*>/g, '');
		}
		return name;
	}
	function get_title(name_str) {
		var name = get_text(name_str);
		var i = name.lastIndexOf(' ');
		if (i >= 0) {
			return name.substr(0, i);
		}
		return '';
	}
	function find_item(name) {
		for (var [key, value] of items) {
			if (value == name) {
				return key;
			}
		}
		return null;
	}
	function auto_loot(id, name) {
		if (no_loot) {
			return false;
		}
		var r = name.match(/^(.+)的尸体$/);
		if (r) {
			var i = $.inArray(r[1], kill_targets);
			if (i >= 0) {
				send_cmd('get all from ' + id);
				kill_targets.splice(i, 1);
				if (auto_loot_timeout && kill_targets.length == 0) {
					clearTimeout(auto_loot_timeout);
					auto_loot_timeout = undefined;
				}
				return true;
			}
		}
		return false;
	}
	
	var has_send_stopstate = false;
	function stop_state() {
		send_cmd('stopstate');
		has_send_stopstate = true;
		setTimeout(function() {
			has_send_stopstate = false;
		}, 500);
	}
	
	function try_perform(id) {
		if (cooldowns.get(id)) {
			return false;
		}
		if ($('span.pfm-item[pid="' + id + '"]').length == 0) {
			return false;
		}
		send_cmd('perform ' + id);
		return true;
	}
	
	var task_h_timer, task_h_listener;
	function stop_task() {
		if (task_h_timer) {
			clearInterval(task_h_timer);
			task_h_timer = undefined;
			log('task stopped.');
		} else if (task_h_listener) {
			remove_listener(task_h_listener);
			task_h_listener = undefined;
			log('task stopped.');
		}
	}
	function add_task_timer(fn, interval) {
		stop_task();
		task_h_timer = setInterval(fn, interval);
	}
	function add_task_listener(types, fn) {
		stop_task();
		task_h_listener = add_listener(types, fn);
	}

	var task_trigger, task_timer, task_target;
	var lian_trigger, lian_skill, lian_index, xue_trigger, xue_skill, dazuo_trigger;
	var xiangyang_trigger;
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
					log('starting loop...');
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
					log("set alias ok.");
				}
			} else {
				if (aliases.has(key)) {
					aliases.delete(key);
					log("alias removed.");
				}
			}
		} else if (cmd == '#t+ task') {
			if (!task_trigger) {
				log('open task trigger.');
				// 高根明对你说道：为师最近突然想尝一下<wht>女儿红</wht>，你去帮我找一下吧。
				task_trigger = add_listener('text', function(data) {
					var r = data.msg.match(/^程药发对你说道：(.+)作恶多端，还请.+为民除害，听说他最近在(.+)\-(.+)出现过。$/);
					if (r) {
						task_target = r[1];
					} else {
						r = data.msg.match(/^<hig>你的追捕任务完成了，目前完成(\d+)\/(\d+)个，已连续完成(\d+)个。<\/hig>$/);
						if (r) {
							if (parseInt(r[1]) >= parseInt(r[2])) {
								execute_cmd('#t- task');
							}
						}
					}
				});
				task_timer = setInterval(function() {
					if (task_target) {
						var id = find_item(task_target);
						if (id) {
							send_cmd('kill ' + id);
							task_target = undefined;
						}
					}
				}, 200);
			}
		} else if (cmd == '#t- task') {
			if (task_trigger) {
				log('close task trigger.');
				remove_listener(task_trigger);
				task_trigger = undefined;
				if (task_timer) {
					clearInterval(task_timer);
					task_timer = undefined;
				}
				task_target = undefined;
			}
		} else if (cmd == '#t+ lian') {
			if (lian_trigger) {
				execute_cmd('#t- lian');
			}
			if (xue_trigger) {
				execute_cmd('#t- xue');
			}
			if (dazuo_trigger) {
				execute_cmd("#t- dazuo");
			}
			lian_index = 0;
			log('open lian trigger.');
			lian_trigger = add_listener(['msg', 'text'], function(data) {
				if (data.type == 'text') {
					if (data.msg.match(/^也许是缺乏实战经验，你觉得你的.+已经到了瓶颈了。$/)
							|| data.msg == '你的基本功火候未到，必须先打好基础才能继续提高。') {
						if (++lian_index < full_skills.length) {
							var str = 'stopstate;';
							if (full_skills[lian_index] == 'wuhuduanmendao') {
								str += 'eq jnk618b6c80;';
							}
							send_cmd(str + 'lianxi ' + full_skills[lian_index]);
						} else {
							execute_cmd('#t- lian');
							send_cmd('stopstate;go east;go out;go south;go west;go west;eq qpei172983d;wa');
						}
					} else if (data.msg == '你的潜能不够，无法继续练习下去了。') {
						execute_cmd('#t- lian');
						send_cmd('stopstate;go east;go out;go south;go west;go west;eq qpei172983d;wa');
					} else {
						var r = data.msg.match(/^<hig>你获得了(\d+)点经验，(\d+)点潜能。<\/hig>$/);
						if (r) {
							if (parseInt(r[1]) < 60) {
								var str = 'stopstate;go east;go east;go north;go enter;go west;';
								if (full_skills[lian_index] == 'wuhuduanmendao') {
									str += 'eq jnk618b6c80;';
								}
								send_cmd(str + 'lianxi ' + full_skills[lian_index]);
							}
						}
					}
				} else if (data.type == 'msg' && data.ch == 'sys') {
					var r = data.content.match(/^(.+)捡到一本挖矿指南，学会了里面记载的挖矿技巧，所有人的挖矿效率都提高了。$/);
					if (r) {
						send_cmd('stopstate;go east;go out;go south;go west;go west;eq qpei172983d;wa');
					}
				}
			});
		} else if (cmd.substr(0, 9) == '#t+ lian ') {
			if (lian_trigger) {
				execute_cmd('#t- lian');
			}
			if (xue_trigger) {
				execute_cmd('#t- xue');
			}
			if (dazuo_trigger) {
				execute_cmd("#t- dazuo");
			}
			lian_skill = $.trim(cmd.substr(9));
			log('open lian ' + lian_skill + ' trigger.');
			lian_trigger = add_listener(['msg', 'text'], function(data) {
				if (data.type == 'text') {
					if (data.msg.match(/^也许是缺乏实战经验，你觉得你的.+已经到了瓶颈了。$/)
							|| data.msg == '你的基本功火候未到，必须先打好基础才能继续提高。'
							|| data.msg == '你的潜能不够，无法继续练习下去了。') {
						execute_cmd('#t- lian');
						send_cmd('stopstate;go east;go out;go south;go west;go west;eq qpei172983d;wa');
					} else {
						var r = data.msg.match(/^<hig>你获得了(\d+)点经验，(\d+)点潜能。<\/hig>$/);
						if (r) {
							if (parseInt(r[1]) < 60) {
								var str = 'stopstate;go east;go east;go north;go enter;go west;';
								if (lian_skill == 'wuhuduanmendao') {
									str += 'eq jnk618b6c80;';
								}
								send_cmd(str + 'lianxi ' + lian_skill);
							}
						}
					}
				} else if (data.type == 'msg' && data.ch == 'sys') {
					var r = data.content.match(/^(.+)捡到一本挖矿指南，学会了里面记载的挖矿技巧，所有人的挖矿效率都提高了。$/);
					if (r) {
						send_cmd('stopstate;go east;go out;go south;go west;go west;eq qpei172983d;wa');
					}
				}
			});
		} else if (cmd == '#t- lian') {
			if (lian_trigger) {
				if (lian_skill) {
					log('close lian ' + lian_skill + ' trigger.');
				} else {
					log('close lian trigger.');
				}
				remove_listener(lian_trigger);
				lian_trigger = undefined;
				lian_skill = undefined;
				lian_index = undefined;
			}
		} else if (cmd.substr(0, 8) == '#t+ xue ') {
			if (xue_trigger) {
				execute_cmd('#t- xue');
			}
			if (lian_trigger) {
				execute_cmd('#t- lian');
			}
			if (dazuo_trigger) {
				execute_cmd("#t- dazuo");
			}
			xue_skill = $.trim(cmd.substr(8));
			log('open xue ' + xue_skill + ' trigger.');
			xue_trigger = add_listener(['msg', 'text'], function(data) {
				if (data.type == 'text') {
					if (data.msg == '你的潜能不够，无法继续学习下去了。'
							|| data.msg == '这项技能你的程度已经不输你师父了。'
							|| data.msg == '你要跟谁学习技能？') {
						execute_cmd('#t- xue');
						send_cmd('stopstate;go east;go out;go south;go west;go west;wa');
					} else {
						var r = data.msg.match(/^<hig>你获得了(\d+)点经验，(\d+)点潜能。<\/hig>$/);
						if (r) {
							if (parseInt(r[1]) < 60) {
								send_cmd('stopstate;go east;go east;go north;go enter;go west');
								setTimeout(function() {
									execute_cmd('xue ' + xue_skill);
								}, 200);
							}
						}
					}
				} else if (data.type == 'msg' && data.ch == 'sys') {
					var r = data.content.match(/^(.+)捡到一本挖矿指南，学会了里面记载的挖矿技巧，所有人的挖矿效率都提高了。$/);
					if (r) {
						send_cmd('stopstate;go east;go out;go south;go west;go west;wa');
					}
				}
			});
		} else if (cmd == '#t- xue') {
			if (xue_trigger) {
				log('close xue ' + xue_skill + ' trigger.');
				remove_listener(xue_trigger);
				xue_trigger = undefined;
				xue_skill = undefined;
			}
		} else if (cmd == '#t+ dazuo') {
			if (dazuo_trigger) {
				execute_cmd("#t- dazuo");
			}
			if (lian_trigger) {
				execute_cmd('#t- lian');
			}
			if (xue_trigger) {
				execute_cmd('#t- xue');
			}
			log('open dazuo trigger.');
			dazuo_trigger = add_listener(['msg', 'text'], function(data) {
				if (data.type == 'text') {
					if (data.msg == '<hic>你觉得你的经脉充盈，已经没有办法再增加内力了。</hic>') {
						execute_cmd('#t- dazuo');
						send_cmd('stopstate;go east;go out;go south;go west;go west;wa');
					} else {
						var r = data.msg.match(/^<hig>你获得了(\d+)点经验，(\d+)点潜能。<\/hig>$/);
						if (r) {
							if (parseInt(r[1]) < 60) {
								send_cmd('stopstate;go east;go east;go north;go enter;go west;dazuo');
							}
						}
					}
				} else if (data.type == 'msg' && data.ch == 'sys') {
					var r = data.content.match(/^(.+)捡到一本挖矿指南，学会了里面记载的挖矿技巧，所有人的挖矿效率都提高了。$/);
					if (r) {
						send_cmd('stopstate;go east;go out;go south;go west;go west;wa');
					}
				}
			});
		} else if (cmd == '#t- dazuo') {
			if (dazuo_trigger) {
				log('close dazuo trigger.');
				remove_listener(dazuo_trigger);
				dazuo_trigger = undefined;
			}
		} else if (cmd == '#t+ xiangyang') {
			if (!xiangyang_trigger) {
				log('open xiangyang trigger.');
				xiangyang_trigger = add_listener(['items', 'itemadd'], function(data) {
					if (data.type == 'items') {
						for (var i = 0; i < data.items.length; i++) {
							var title = get_title(data.items[i].name);
							if (title == '蒙古兵') {
								stop_state();
								send_cmd('kill ' + data.items[i].id);
							} else if (title == '十夫长') {
								stop_state();
								var id = data.items[i].id;
								setTimeout(function() {
									send_cmd('kill ' + id);
								}, 500);
							}
						}
					} else if (data.type == 'itemadd') {
						var title = get_title(data.name);
						if (title == '蒙古兵') {
							stop_state();
							send_cmd('kill ' + data.id);
						} else if (title == '十夫长') {
							stop_state();
							setTimeout(function() {
								send_cmd('kill ' + data.id);
							}, 500);
						}
					}
				});
			}
		} else if (cmd == '#t- xiangyang') {
			if (xiangyang_trigger) {
				log('close xiangyang trigger.');
				remove_listener(xiangyang_trigger);
				xiangyang_trigger = undefined;
			}
		} else if (cmd == '#combat') {
			log('open auto combat...');
			add_task_timer(function() {
				if (in_combat && i_am_ready && !i_am_busy) {
					try_perform('force.xi');
					try_perform('dodge.power');
					try_perform('sword.wu');
					try_perform('blade.chan');
					try_perform('throwing.jiang');
					try_perform('unarmed.chan');
				}
			}, 200);
		} else if (cmd == '#combat 1') {
			log('open auto combat mode 1...');
			var action_state, is_busy;
			add_task_listener(['combat', 'status', 'dispfm'], function(data) {
				if (data.type == 'combat') {
					if (data.start) {
						is_busy = false;
						action_state = 1;
						send_cmd('eq 9wow13462cb;perform force.xi;perform dodge.power;perform sword.wu;perform unarmed.chan');
					}
				} else if (data.type == 'status') {
					if (data.action == 'add' && data.id != my_id && data.sid == 'busy') {
						is_busy = true;
					} else if (data.action == 'remove' && data.id != my_id && data.sid == 'busy') {
						is_busy = false;
						if (action_state == 1) {
							action_state = 2;
							send_cmd('perform force.xi;perform dodge.power;perform sword.poqi');
						} else if (action_state == 3) {
							action_state = 4;
							send_cmd('perform whip.chan');
						} else if (action_state == 7 || action_state == 8) {
							action_state = 1;
							send_cmd('perform force.xi;perform dodge.power;perform sword.wu;perform unarmed.chan');
						}
					} else if (data.action == 'remove' && data.id == my_id && data.sid == 'sword') {
						if (action_state == 2) {
							/*
							action_state = 3;
							send_cmd('eq a3gg1689bd4'); */
							action_state = 5;
							send_cmd('eq jnk618b6c80');
						}
					}
				} else if (data.type == 'dispfm') {
					if (data.id == 'whip.chan' && action_state == 4) {
						setTimeout(function() {
							action_state = 8;
							send_cmd('eq 9wow13462cb');
							/*
							if (is_busy) {
								action_state = 5;
								send_cmd('eq jnk618b6c80');
							} else {
								action_state = 0;
								send_cmd('eq 9wow13462cb');
							} */
						}, data.rtime);
					} else if (!data.id && action_state == 5) {
						setTimeout(function() {
							action_state = 6;
							send_cmd('perform force.xi;perform dodge.power;perform blade.chan');
						}, data.rtime);
					} else if (data.id == 'blade.chan' && action_state == 6) {
						setTimeout(function() {
							action_state = 7;
							send_cmd('perform force.xi;perform dodge.power;perform unarmed.chan');
						}, data.rtime);
					} else if (data.id == 'unarmed.chan' && action_state == 7) {
						setTimeout(function() {
							action_state = 8;
							send_cmd('eq 9wow13462cb');
						}, data.rtime);
					} else if (!data.id && action_state == 8) {
						setTimeout(function() {
							if (action_state == 8) {
								action_state = 1;
								send_cmd('perform force.xi;perform dodge.power;perform sword.wu');
							}
						}, data.rtime);
					}
				}
			});
		} else if (cmd == '#combat 2') {
			log('open auto combat mode 2...');
			var action_state, is_busy;
			add_task_listener(['combat', 'status', 'dispfm'], function(data) {
				if (data.type == 'combat') {
					if (data.start) {
						is_busy = false;
						action_state = 1;
						send_cmd('eq a3gg1689bd4;perform whip.chan');
					}
				} else if (data.type == 'status') {
					if (data.action == 'add' && data.id != my_id && data.sid == 'busy') {
						is_busy = true;
					} else if (data.action == 'remove' && data.id != my_id && data.sid == 'busy') {
						is_busy = false;
						if (action_state == 4) {
							action_state = 5;
							send_cmd('perform force.xi;perform dodge.power;perform sword.wu;perform unarmed.chan');
						} else if (action_state == 5) {
							action_state = 6;
							send_cmd('perform force.xi;perform dodge.power;perform sword.poqi');
						} else if (action_state == 7) {
							action_state = 1;
							send_cmd('perform whip.chan');
						}
					} else if (data.action == 'remove' && data.id == my_id && data.sid == 'sword') {
						if (action_state == 6) {
							action_state = 7;
							send_cmd('eq a3gg1689bd4');
						}
					}
				} else if (data.type == 'dispfm') {
					if (data.id == 'whip.chan' && action_state == 1) {
						setTimeout(function() {
							if (is_busy) {
								action_state = 2;
								send_cmd('eq jnk618b6c80');
							}
						}, data.rtime);
					} else if (!data.id && action_state == 2) {
						setTimeout(function() {
							action_state = 3;
							send_cmd('perform force.xi;perform dodge.power;perform blade.chan');
						}, data.rtime);
					} else if (data.id == 'blade.chan' && action_state == 3) {
						setTimeout(function() {
							action_state = 4;
							send_cmd('eq 9wow13462cb');
						}, data.rtime);
					} else if (!data.id && action_state == 4) {
						setTimeout(function() {
							if (action_state == 4) {
								action_state = 5;
								send_cmd('perform force.xi;perform dodge.power;perform sword.wu;perform unarmed.chan');
							}
						}, data.rtime);
					} else if (!data.id && action_state == 7) {
						setTimeout(function() {
							if (action_state == 7) {
								action_state = 1;
								send_cmd('perform whip.chan');
							}
						}, data.rtime);
					}
				}
			});
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
		if (args[0] == 'items') {
			Dialog.show('pack');
			args[0] = '';
		} else if (args[0] == 'skills') {
			Dialog.show('skills');
			args[0] = '';
		} else if (args[0] == 'tasks') {
			Dialog.show('tasks');
			args[0] = '';
		} else if (args[0] == 'shop') {
			Dialog.show('shop');
			args[0] = '';
		} else if (args[0] == 'message') {
			Dialog.show('message');
			args[0] = '';
		} else if (args[0] == 'stats') {
			Dialog.show('stats');
			args[0] = '';
		} else if (args[0] == 'fly') {
			args[0] = 'jh';
			if (args[1]) {
				var id = map_ids.get(args[1]);
				if (id) {
					args[1] = id;
				}
				args[1] = 'fam ' + args[1] + " start";
			} else {
				Dialog.show('jh');
				args[0] = '';
			}
		} else if (args[0] == 'look' || args[0] == 'fight' || args[0] == 'kill') {
			var id = find_item(args[1]);
			if (id) {
				args[1] = id;
			}
		} else if (args[0] == 'get') {
			var id = find_item(args[1]);
			if (id) {
				args[1] = id;
			}
			args[1] = 'all from ' + args[1];
		} else if (args[0] == 'xue') {
			var r = args[1].match(/(.+)\s+from\s+(.+)/);
			if (r) {
				var id = find_item(r[2]);
				if (id) {
					args[1] = r[1] + ' from ' + id;
				}
			}
		} else if (args[0] == 'buy') {
			var r = args[1].match(/(\d+)\s+(.+)\s+from\s+(.+)/);
			if (!r) {
				r = ('1 ' + args[1]).match(/(\d+)\s+(.+)\s+from\s+(.+)/);
			}
			if (r) {
				var id = find_item(r[3]);
				if (id) {
					var h = add_listener('dialog', function(data) {
						if (data.dialog == 'list' && data.seller == id) {
							for (var i = 0; i < data.selllist.length; i++) {
								if (r[2] == data.selllist[i].name || r[2] == get_name(data.selllist[i].name)) {
									send_cmd('buy ' + r[1] + ' ' + data.selllist[i].id + ' from ' + id);
									break;
								}
							}
							$('.dialog-close').click();
							remove_listener(h);
						}
					});
					args[0] = 'list';
					args[1] = id;
				}
			}
		} else if (args[0] == 'sell') {
			var r = args[1].match(/(\d+)\s+(.+)\s+to\s+(.+)/);
			if (!r) {
				r = ('1 ' + args[1]).match(/(\d+)\s+(.+)\s+to\s+(.+)/);
			}
			if (r) {
				var id = find_item(r[3]);
				if (id) {
					var h = add_listener('dialog', function(data) {
						if (data.dialog == 'pack') {
							for (var i = 0; i < data.items.length; i++) {
								if (r[2] == data.items[i].name || r[2] == get_name(data.items[i].name)) {
									send_cmd('sell ' + r[1] + ' ' + data.items[i].id + ' to ' + id);
									break;
								}
							}
							$('.dialog-close').click();
							remove_listener(h);
						}
					});
					args[0] = 'pack';
					args[1] = '';
				}
			}
		} else if (args[0] == 'qu') {
			var r = args[1].match(/(\d+)\s+(.+)/);
			if (!r) {
				r = ('1 ' + args[1]).match(/(\d+)\s+(.+)/);
			}
			if (r) {
				var h = add_listener('dialog', function(data) {
					if (data.dialog == 'list' && data.stores) {
						for (var i = 0; i < data.stores.length; i++) {
							if (r[2] == data.stores[i].name || r[2] == get_name(data.stores[i].name)) {
								send_cmd('qu ' + r[1] + ' ' + data.stores[i].id);
								break;
							}
						}
						$('.dialog-close').click();
						remove_listener(h);
					}
				});
				args[0] = 'store';
				args[1] = '';
			}
		} else if (args[0] == 'cun') {
			var r = args[1].match(/(\d+)\s+(.+)/);
			if (!r) {
				r = ('1 ' + args[1]).match(/(\d+)\s+(.+)/);
			}
			if (r) {
				var h = add_listener('dialog', function(data) {
					if (data.dialog == 'pack') {
						for (var i = 0; i < data.items.length; i++) {
							if (r[2] == data.items[i].name || r[2] == get_name(data.items[i].name)) {
								send_cmd('store ' + r[1] + ' ' + data.items[i].id);
								break;
							}
						}
						$('.dialog-close').click();
						remove_listener(h);
					}
				});
				args[0] = 'pack';
				args[1] = '';
			}
		} else if (args[0] == 'east' || args[0] == 'south' || args[0] == 'west'
				|| args[0] == 'north' || args[0] == 'southeast'
				|| args[0] == 'southwest' || args[0] == 'northeast'
				|| args[0] == 'northwest' || args[0] == 'up'
				|| args[0] == 'down' || args[0] == 'enter' || args[0] == 'out') {
			args[1] = args[0];
			args[0] = 'go';
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
					SendCommand(aliases.get('p1'));
					e.preventDefault();
				} else if (e.which == 113) { // F2
					SendCommand(aliases.get('p2'));
					e.preventDefault();
				} else if (e.which == 114) { // F3
					SendCommand(aliases.get('p3'));
					e.preventDefault();
				} else if (e.which == 115) { // F4
					SendCommand(aliases.get('p4'));
					e.preventDefault();
				} else if (e.which == 116) { // F5
					SendCommand(aliases.get('p5'));
					e.preventDefault();
				} else if (e.which == 117) { // F6
					SendCommand('eq 86q7155246a;eq cd9r156c5c0;eq 2qfb188cf4d;eq 40z51332c8f;eq sg9w14d7dca;eq x6e51518454');
					e.preventDefault();
				} else if (e.which == 118) { // F7
					SendCommand('eq iq8b15a9c27;eq 1tgm18a2aaf;eq 2qfb188cf4d;eq 40z51332c8f;eq sg9w14d7dca;eq x6e51518454');
					e.preventDefault();
				} else if (e.which == 119) { // F8
					SendCommand('eq 603z155852b;eq cd9r156c5c0;eq wxth16a8173;eq q0ui10f5a1d;eq lhc313bbbf4;eq buhp157ff22');
					e.preventDefault();
				} else if (e.which == 120) { // F9
					SendCommand('jh fam 0 start;go west;go west;go north;go enter;go west;lianxi dasongyangshenzhang');
					e.preventDefault();
				} else if (e.which == 121) { // F10
					SendCommand('jh fam 0 start;go west;go west;go west;go west;eq qpei172983d;wa');
					e.preventDefault();
				} else if (e.which == 122) { // F11
					no_loot = !no_loot;
					log('set no_loot ' + no_loot);
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
	ReceiveMessage('<hir>addon loaded</hir>');
})();