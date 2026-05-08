require('dotenv').config()
const { REST, Routes, SlashCommandBuilder } = require('discord.js')

const commands = [
  new SlashCommandBuilder()
    .setName('전적')
    .setDescription('PUBG 플레이어 전적을 조회합니다')
    .addStringOption((opt) =>
      opt.setName('닉네임').setDescription('조회할 플레이어 닉네임').setRequired(true)
    ),
  new SlashCommandBuilder()
    .setName('클랜')
    .setDescription('PUBG 클랜 정보를 조회합니다')
    .addStringOption((opt) =>
      opt.setName('클랜명').setDescription('조회할 클랜명').setRequired(true)
    ),
].map((cmd) => cmd.toJSON())

const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_BOT_TOKEN)

;(async () => {
  try {
    console.log('슬래시 커맨드 등록 중...')
    await rest.put(Routes.applicationCommands(process.env.DISCORD_CLIENT_ID), { body: commands })
    console.log('✅ 슬래시 커맨드 등록 완료!')
  } catch (err) {
    console.error('오류:', err)
  }
})()
