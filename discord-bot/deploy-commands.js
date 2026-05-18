require('dotenv').config()
const { REST, Routes, SlashCommandBuilder, ChannelType } = require('discord.js')

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

  new SlashCommandBuilder()
    .setName('뉴스채널')
    .setDescription('PUBG 공식 뉴스 자동 알림 채널 관리')
    .addSubcommand((sub) =>
      sub
        .setName('설정')
        .setDescription('뉴스 알림을 받을 채널을 설정합니다')
        .addChannelOption((opt) =>
          opt
            .setName('채널')
            .setDescription('알림을 받을 텍스트 채널')
            .addChannelTypes(ChannelType.GuildText)
            .setRequired(true)
        )
    )
    .addSubcommand((sub) =>
      sub
        .setName('해제')
        .setDescription('채널의 뉴스 알림을 해제합니다')
        .addChannelOption((opt) =>
          opt
            .setName('채널')
            .setDescription('알림을 해제할 채널')
            .addChannelTypes(ChannelType.GuildText)
            .setRequired(true)
        )
    )
    .addSubcommand((sub) =>
      sub.setName('목록').setDescription('현재 설정된 뉴스 알림 채널 목록을 확인합니다')
    ),
].map((cmd) => cmd.toJSON())

const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_BOT_TOKEN)

;(async () => {
  try {
    console.log('슬래시 커맨드 등록 중...')
    await rest.put(Routes.applicationCommands(process.env.DISCORD_CLIENT_ID), { body: commands })
    console.log('✅ 슬래시 커맨드 등록 완료!')
    console.log('  /전적, /클랜, /뉴스채널 (설정·해제·목록)')
  } catch (err) {
    console.error('오류:', err)
  }
})()
