
const Sequelize = require('sequelize');
const {models} = require ('./model');
const {log, biglog, errorlog, colorize} = require("./out");


exports.helpCmd = rl => {
	log("Comandos:");
	log("  h|help - Muestra esta ayuda.");
	log("  list - Listar los quizzes existentes.");
	log("  show <id> - Muestra la pregunta y la respuesta el quiz indicado.");
	log("  add - Añadir un nuevo quiz interactivamente.");
	log("  delete <id> - Borrar el quiz indicado.");
	log("  edit <id> - Editar el quiz indicado.");
	log("  test <id> - Probar el quiz indicado.");
	log("  p|play - Jugar a preguntar aleatoriamente todos los quizzes.");
	log("  credits - Créditos.");
	log("  q|quit - Salir del programa.");
	rl.prompt();
};

exports.listCmd = rl => {
	models.quiz.findAll()
	.each(quiz=>{
		log(` [${colorize(quiz.id, 'magenta')}]: ${quiz.question}`);
	})
	.catch(error => {
		errorlog(error.message);
	})
	.then(()=>{
		rl.prompt();
	});

};

const validateId = id =>{

	return new Sequelize.Promise((resolve, reject)=>{
		if(typeof id === "undefined"){
			reject(new Error(`Falta el parametro <id>.`));
		}else {
			id = parseInt(id);
			if(Number.isNaN(id)){
				reject(new Error(`El valor del parámetro <id> no es un número.`));
			} else{
				resolve(id);
			}
		}
	});
};


exports.showCmd = (rl,id) => {
	validateId(id)
	.then(id=> models.quiz.findById(id))
	.then(quiz =>{
		if(!quiz){
			throw new error(`No existe un quiz asociado al id= ${id}.`);
		}
		log(`[${colorize(id,'magenta')}]: ${quiz.question} ${colorize("=>","magenta")} ${quiz.answer}`);
		
	})
	.catch(error => {
		errorlog(error.message);
	})
	.then(()=>{
		rl.prompt();
	});	
};


const makeQuestion = (rl, text)=> {
	return new Sequelize.Promise((resolve,reject)=> {
		rl.question(colorize(text,'red'),answer=>{
			resolve(answer.trim());
		});
	});
};

exports.addCmd = rl => {
    makeQuestion(rl, 'Introduzca una pregunta: ')
	.then(q => {
		return makeQuestion(rl, 'Introduzca la respuesta ')
		.then(a => {
			return {question: q, answer: a};
		});
	})
	.then(quiz => {
		return models.quiz.create(quiz);
	})
	.then((quiz) => {
		log(` ${colorize('Se ha añadido','magenta')}: ${quiz.question} ${colorize('=>','magenta')} ${quiz.answer}`);
	})
	.catch(Sequelize.ValidationError, error => {
		errorlog('El quiz es erroneo:');
		error.errors.forEach(({message}) => errorlog(message));
	})
	.catch(error => {
		errorlog(error.message);
	})
	.then(() => {
		rl.prompt();
	});
};

/*exports.deleteCmd = (rl,id) => {

	validateId(id)
	.then(id=> models.quiz.destroy({where: {id}}))
	.catch(error =>{
		errorlog(error.message);
	})
	.then (()=>{
		rl.prompt();
	});
};*/
exports.deleteCmd = (rl,id) => {
	validateId(id)
	.then(id => models.quiz.destroy({where: {id}}))
	.catch(error => {
		errorlog(error.message);
	})
	.then(() => {
		rl.prompt();
	});
};


exports.editCmd = (rl,id)=> {
	validateId(id)
	.then(id => models.quiz.findById(id))
	.then(quiz=>{
		if(!quiz){
			throw new error(`No existe un quiz asociado al id= ${id}.`);
		}
		process.stdout.isTTY && setTimeout(()=>{ rl.write(quiz.question)},0);
		return makeQuestion(rl, ' Introduzca la pregunta: ')
		.then(q =>{
			process.stdout.isTTY && setTimeout(()=> {rl.write(quiz.answer)},0);
			return makeQuestion(rl, ' Introduzca una respuesta: ')
			.then(a =>{
				quiz.question=q;
				quiz.answer=a;
				return quiz;
			});
		});
	})
	.then(quiz =>{
		return quiz.save();
	})
	.then(quiz=>{
		log(` Se ha cambiado el quiz ${colorize(id,'magenta')} por: ${quiz.question} ${colorize('=>','magenta')} ${quiz.answer}`);				
	})
	.catch(Sequelize.ValidationError, error =>{
		errorlog('El quiz es erroneo:');
		error.errors.forEach(({message})=> errorlog(message));

	})
	.catch(error => {
		errorlog(error.message);
	})
	.then(()=>{
		rl.prompt();
	});
	
};

exports.testCmd = (rl,id)  => {
	validateId(id)
	.then(id => models.quiz.findById(id))
	.then(quiz=>{
		if(!quiz){
			throw new error(`No existe un quiz asociado al id= ${id}.`);
		}
		return makeQuestion(rl, ` ${quiz.question}? `)
		.then(a=>{
			ans1= (a || "").trim();
			ans=ans1.toUpperCase();
			t=JSON.parse(JSON.stringify(quiz.answer));
			s= t.toUpperCase();

			if(ans===s){
				log(` Su respuesta es correcta.`);
				biglog('Correcta', 'green');
				
			}
			else{
				log(` Su respuesta es incorrecta.`);
				biglog('Incorreta', 'red');
				
			}

		})
	})
	.catch(Sequelize.ValidationError, error =>{
		errorlog('El quiz es erroneo:');
		error.errors.forEach(({message})=> errorlog(message));
	})
	.catch(error => {
		errorlog(error.message);
	})
	.then(()=>{
		rl.prompt();
	});


	
};

exports.playCmd = rl  => {
	let score = 0;
	let toBeResolved= [];
	
	models.quiz.findAll({raw: true})
	.then( quizzes =>{
		toBeResolved = quizzes;
	})
	.then(() => {
		return playOne();
	})
	.catch(error => {
		console.log(error);
	})
	.then(()=>{
		rl.prompt();
	});


	const playOne=()=>{
		return new Promise((resolve,reject)=>{
			if(toBeResolved.length<=0){
				log(` No hay nada más que preguntar.`);
				log(` Fin del examen. Aciertos: `);
				biglog( `${score} `, 'magenta');
				resolve();
				return;


			}  else{
				try{
					let idr = Math.random()*toBeResolved.length;
					let ids= Math.floor(idr);
					const quiz = toBeResolved[ids];
					/*toBeResolved[ids]=null;
					let m=0;

					for (var i = 0; i <num; i++) {
						if(toBeResolved[i]!== null){
							toBeResolved[m]=toBeResolved[i];
							m++;
						} 
					}

					num--;*/
					toBeResolved.splice(ids,1);

					makeQuestion(rl, ` ${quiz.question}? `)
					.then( answer=>{
						ans1= (answer || "").trim();
						ans=ans1.toUpperCase();
						t=JSON.parse(JSON.stringify(quiz.answer));
						s= t.toUpperCase();
						console.log(s);
						console.log(ans);
						if(ans===s){
							score=score+1;
							log(` CORRECTO - Lleva ${score} aciertos.`);
							rl.prompt();
							resolve(playOne());
						}
						else{
							log(` INCORRECTO.`);
							log(` Fin del examen. Aciertos: `);
							biglog(` ${score}`, 'magenta');
							rl.prompt();
							resolve();
						}
						});
					
				}
				catch(error){
					errorlog(error.message);
					rl.prompt();
				}
			}
		})
	};


};

exports.creditsCmd = rl => {
	log("Autor de la práctica:");
	log("Sergio López López");
	rl.prompt();
};

exports.quitCmd = rl  => {
	rl.close();
};