import bcrypt from "bcryptjs";

async function run() {
  const password = "123456";
  const hash = await bcrypt.hash(password, 10);

  console.log(hash);
  console.log(await bcrypt.compare("123456", hash));
}

run();