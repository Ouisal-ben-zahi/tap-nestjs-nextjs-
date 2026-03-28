import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  MessageEvent,
  Param,
  Post,
  Put,
  Query,
  Req,
  Sse,
  UploadedFile,
  UploadedFiles,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { FileFieldsInterceptor, FileInterceptor } from '@nestjs/platform-express';
<<<<<<< Updated upstream
import {
  Observable,
  from,
  interval,
  mergeMap,
  map,
  takeWhile,
  take,
  startWith,
  distinctUntilChanged,
} from 'rxjs';
import {
  DashboardService,
  type ApplyJobPayload,
  type RecruiterJobPayload,
  type RecruiterMatchByOfferPayload,
  type RecruiterScheduleInterviewPayload,
  type RecruiterValidateCandidatePayload,
  type RecruiterSaveInterviewPdfPayload,
  type RecruiterUpdateCandidateStatusPayload,
  type ToggleSavedJobPayload,
  type RecruiterProfileUpsertPayload,
} from './dashboard.service';
=======
import { DashboardService, type ApplyJobPayload, type RecruiterJobPayload, type RecruiterMatchByOfferPayload } from './dashboard.service';
>>>>>>> Stashed changes

@Controller('dashboard')
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  private parseGenerationSinceMs(sinceRaw?: string): number | undefined {
    if (sinceRaw === undefined || sinceRaw === '') return undefined;
    const n = Number(sinceRaw);
    if (!Number.isFinite(n) || n < 0) {
      throw new BadRequestException(
        'Le paramètre since doit être un timestamp unix en millisecondes.',
      );
    }
    return Math.floor(n);
  }


  // === JWT-based routes (no userId in URL) ===

  @Get('candidat/stats')
  @UseGuards(AuthGuard('jwt'))
  async getCandidateStatsByJwt(@Req() req: any) {
    const userId = await this.dashboardService.resolveJwtUserId(req?.user);
    return this.dashboardService.getCandidateStats(userId);
  }

  @Get('candidat/score-json')
  @UseGuards(AuthGuard('jwt'))
  async getCandidateScoreByJwt(@Req() req: any) {
    const userId = await this.dashboardService.resolveJwtUserId(req?.user);
    return this.dashboardService.getCandidateScoreFromJsonByUser(userId);
  }

  @Get('candidat/portfolio')
  @UseGuards(AuthGuard('jwt'))
  async getCandidatePortfolioByJwt(@Req() req: any) {
    const userId = await this.dashboardService.resolveJwtUserId(req?.user);
    return this.dashboardService.getCandidatePortfolio(userId);
  }

  @Get('candidat/applications')
  @UseGuards(AuthGuard('jwt'))
  async getCandidateApplicationsByJwt(@Req() req: any) {
    const userId = await this.dashboardService.resolveJwtUserId(req?.user);
    return this.dashboardService.getCandidateApplications(userId);
  }

  @Get('candidat/scheduled-interviews')
  @UseGuards(AuthGuard('jwt'))
  async getCandidateScheduledInterviewsByJwt(@Req() req: any) {
    const userId = await this.dashboardService.resolveJwtUserId(req?.user);
    return this.dashboardService.getCandidateScheduledInterviews(userId);
  }

  @Get('candidat/profile')
  @UseGuards(AuthGuard('jwt'))
  async getCandidateProfileByJwt(@Req() req: any) {
    const userId = await this.dashboardService.resolveJwtUserId(req?.user);
    return this.dashboardService.getCandidateProfileByUser(userId);
  }

  @Put('candidat/profile')
  @UseGuards(AuthGuard('jwt'))
  async updateCandidateProfileByJwt(@Req() req: any, @Body() body: Record<string, any>) {
    const userId = await this.dashboardService.resolveJwtUserId(req?.user);
    return this.dashboardService.updateCandidateProfileByUser(userId, body);
  }

  @Get('candidat/cv-files')
  @UseGuards(AuthGuard('jwt'))
  async getCandidateCvFilesByJwt(@Req() req: any) {
    const userId = await this.dashboardService.resolveJwtUserId(req?.user);
    return this.dashboardService.getCandidateCvFiles(userId);
  }

  @Get('candidat/talentcard-files')
  @UseGuards(AuthGuard('jwt'))
  async getCandidateTalentcardFilesByJwt(@Req() req: any) {
    const userId = await this.dashboardService.resolveJwtUserId(req?.user);
    return this.dashboardService.getCandidateTalentcardFiles(userId);
  }

  @Get('candidat/portfolio-pdf-files')
  @UseGuards(AuthGuard('jwt'))
  async getCandidatePortfolioPdfFilesByJwt(@Req() req: any) {
    const userId = await this.dashboardService.resolveJwtUserId(req?.user);
    return this.dashboardService.getCandidatePortfolioPdfFiles(userId);
  }

  /**
   * État agrégé de la génération (CV → Talent Card → scoring → portfolio).
   * Query optionnel `since` = timestamp ms (début côté client) pour ne compter que les fichiers « frais ».
   */
  @Get('candidat/generation-status')
  @UseGuards(AuthGuard('jwt'))
  async getCandidateGenerationStatusByJwt(
    @Req() req: any,
    @Query('since') sinceRaw?: string,
  ) {
    const userId = await this.dashboardService.resolveJwtUserId(req?.user);
    const sinceMs = this.parseGenerationSinceMs(sinceRaw);
    return this.dashboardService.getCandidateGenerationStatus(
      userId,
      sinceMs,
    );
  }

  /**
   * Flux SSE : ré-émet le même JSON que GET generation-status toutes les 2 s
   * jusqu’à `allComplete` (inclut le dernier événement) ou 600 ticks (~20 min).
   * Auth : header Authorization Bearer (utiliser fetch + ReadableStream côté navigateur, pas EventSource).
   */
  @Sse('candidat/generation-status/stream')
  @UseGuards(AuthGuard('jwt'))
  candidateGenerationStatusStream(
    @Req() req: any,
    @Query('since') sinceRaw?: string,
  ): Observable<MessageEvent> {
    const sinceMs = this.parseGenerationSinceMs(sinceRaw);

    return from(this.dashboardService.resolveJwtUserId(req?.user)).pipe(
      mergeMap((userId) =>
        interval(2000).pipe(
          startWith(0),
          mergeMap(() =>
            from(
              this.dashboardService.getCandidateGenerationStatus(
                userId,
                sinceMs,
              ),
            ),
          ),
          distinctUntilChanged(
            (a, b) => JSON.stringify(a) === JSON.stringify(b),
          ),
          map(
            (payload) =>
              ({ data: JSON.stringify(payload) }) as MessageEvent,
          ),
          takeWhile((ev) => {
            try {
              const d = JSON.parse(String(ev.data)) as { allComplete?: boolean };
              return !d.allComplete;
            } catch {
              return true;
            }
          }, true),
          take(600),
        ),
      ),
    );
  }

  @Post('candidat/generate-portfolio-long')
  @UseGuards(AuthGuard('jwt'))
  async generateCandidatePortfolioLongByJwt(
    @Req() req: any,
    @Body() body: { lang?: 'fr' | 'en' },
  ) {
    const userId = await this.dashboardService.resolveJwtUserId(req?.user);
    return this.dashboardService.generateCandidatePortfolioLong(userId, body?.lang);
  }

  // === Portfolio long flow (chatbot → scoring → generation) ===

  @Post('candidat/portfolio-long/start')
  @UseGuards(AuthGuard('jwt'))
  async startCandidatePortfolioLongChatByJwt(
    @Req() req: any,
    @Body() body: { lang?: 'fr' | 'en' },
  ) {
    const userId = await this.dashboardService.resolveJwtUserId(req?.user);
    return (this.dashboardService as any).startCandidatePortfolioLongChat(userId, body?.lang);
  }

  @Post('candidat/portfolio-long/:sessionId/message')
  @UseGuards(AuthGuard('jwt'))
  async sendCandidatePortfolioLongChatMessageByJwt(
    @Req() req: any,
    @Param('sessionId') sessionId: string,
    @Body() body: { message: string },
  ) {
    const userId = await this.dashboardService.resolveJwtUserId(req?.user);
    return (this.dashboardService as any).sendCandidatePortfolioLongChatMessage(userId, sessionId, body?.message);
  }

  @Get('candidat/portfolio-long/:sessionId/state')
  @UseGuards(AuthGuard('jwt'))
  async getCandidatePortfolioLongChatStateByJwt(
    @Req() req: any,
    @Param('sessionId') sessionId: string,
  ) {
    const userId = await this.dashboardService.resolveJwtUserId(req?.user);
    return (this.dashboardService as any).getCandidatePortfolioLongChatState(userId, sessionId);
  }

  @Post('candidat/portfolio-long/run')
  @UseGuards(AuthGuard('jwt'))
  @HttpCode(202)
  async runCandidatePortfolioLongPipelineByJwt(
    @Req() req: any,
    @Body() body: { lang?: 'fr' | 'en' },
  ) {
    const userId = await this.dashboardService.resolveJwtUserId(req?.user);
    return (this.dashboardService as any).runCandidatePortfolioLongPipeline(userId, body?.lang);
  }

  @Post('candidat/interview/start')
  @UseGuards(AuthGuard('jwt'))
  async startCandidateInterviewSimulationByJwt(
    @Req() req: any,
    @Body() body: { interviewType?: string },
  ) {
    const userId = await this.dashboardService.resolveJwtUserId(req?.user);
    return (this.dashboardService as any).startCandidateInterviewSimulation(userId, body?.interviewType);
  }

  @Get('candidat/interview/:sessionId/status')
  @UseGuards(AuthGuard('jwt'))
  async getCandidateInterviewSimulationStatusByJwt(
    @Req() req: any,
    @Param('sessionId') sessionId: string,
  ) {
    const userId = await this.dashboardService.resolveJwtUserId(req?.user);
    return (this.dashboardService as any).getCandidateInterviewSimulationStatus(userId, sessionId);
  }

  @Get('candidat/interview/:sessionId/audio')
  @UseGuards(AuthGuard('jwt'))
  async getCandidateInterviewSimulationAudioByJwt(
    @Req() req: any,
    @Param('sessionId') sessionId: string,
  ) {
    const userId = await this.dashboardService.resolveJwtUserId(req?.user);
    return (this.dashboardService as any).getCandidateInterviewSimulationAudio(userId, sessionId);
  }

  @Post('candidat/interview/:sessionId/record')
  @UseGuards(AuthGuard('jwt'))
  @UseInterceptors(FileInterceptor('audio'))
  async sendCandidateInterviewSimulationAudioByJwt(
    @Req() req: any,
    @Param('sessionId') sessionId: string,
    @UploadedFile() audio: any,
  ) {
    const userId = await this.dashboardService.resolveJwtUserId(req?.user);
    return (this.dashboardService as any).sendCandidateInterviewSimulationAudio(userId, sessionId, audio);
  }

  @Get('candidat/interview/:sessionId/evaluation')
  @UseGuards(AuthGuard('jwt'))
  async getCandidateInterviewSimulationEvaluationByJwt(
    @Req() req: any,
    @Param('sessionId') sessionId: string,
  ) {
    const userId = await this.dashboardService.resolveJwtUserId(req?.user);
    return (this.dashboardService as any).getCandidateInterviewSimulationEvaluation(userId, sessionId);
  }

  @Post('candidat/upload-cv')
  @UseGuards(AuthGuard('jwt'))
  @UseInterceptors(
    FileFieldsInterceptor([
      { name: 'file', maxCount: 1 },
      { name: 'img_file', maxCount: 1 },
    ]),
  )
  async uploadCandidateCvByJwt(
    @Req() req: any,
    @UploadedFiles()
    files: { file?: any[]; img_file?: any[] },
    @Body() body: Record<string, any>,
  ) {
    const userId = await this.dashboardService.resolveJwtUserId(req?.user);
    const cvFile = files?.file?.[0];
    const imgFile = files?.img_file?.[0];
    return this.dashboardService.uploadCandidateCv(userId, cvFile, {
      onboarding: body,
      imgFile,
    });
  }

  @Post('candidat/check-cv-photo')
  @UseGuards(AuthGuard('jwt'))
  @UseInterceptors(FileInterceptor('file'))
  async checkCandidateCvPhotoByJwt(
    @Req() req: any,
    @UploadedFile() file: any,
  ) {
    const userId = await this.dashboardService.resolveJwtUserId(req?.user);
    return this.dashboardService.checkCvHasPhoto(userId, file);
  }

  @Delete("candidat/cv-file")
  @UseGuards(AuthGuard("jwt"))
  async deleteCandidateCvFileByJwt(@Req() req: any, @Query("path") path: string) {
    const userId = await this.dashboardService.resolveJwtUserId(req?.user);
    await this.dashboardService.deleteCandidateCvFile(userId, path);
    return { success: true };
  
  }

  @Delete("candidat/talentcard-file")
  @UseGuards(AuthGuard("jwt"))
  async deleteCandidateTalentcardFileByJwt(
    @Req() req: any,
    @Query("path") path: string,
  ) {
    await this.dashboardService.deleteCandidateTalentcardFile(req.user.sub, path);
    return { success: true };
  }

  @Delete("candidat/portfolio-pdf-file")
  @UseGuards(AuthGuard("jwt"))
  async deleteCandidatePortfolioPdfFileByJwt(
    @Req() req: any,
    @Query("path") path: string,
  ) {
    await this.dashboardService.deleteCandidatePortfolioPdfFile(req.user.sub, path);
    return { success: true };
  }

  @Delete('candidat/avatar')
  @UseGuards(AuthGuard('jwt'))
  async deleteCandidateAvatarByJwt(@Req() req: any) {
    const userId = await this.dashboardService.resolveJwtUserId(req?.user);
    await this.dashboardService.deleteCandidateAvatar(userId);
    return { success: true };
  }


  @Get('recruteur/jobs')
  @UseGuards(AuthGuard('jwt'))
  async getRecruiterJobsByJwt(@Req() req: any) {
    const userId = await this.dashboardService.resolveJwtUserId(req?.user);
    return this.dashboardService.getRecruiterJobsWithCounts(userId);
  }

  @Post('recruteur/jobs')
  @UseGuards(AuthGuard('jwt'))
  async createRecruiterJobByJwt(@Req() req: any, @Body() body: RecruiterJobPayload) {
    const userId = await this.dashboardService.resolveJwtUserId(req?.user);
    return this.dashboardService.createRecruiterJob(userId, body);
  }

  @Get('recruteur/jobs/:jobId')
  @UseGuards(AuthGuard('jwt'))
  async getRecruiterJobByIdJwt(@Req() req: any, @Param('jobId') jobId: string) {
    const userId = await this.dashboardService.resolveJwtUserId(req?.user);
    const id = Number.parseInt(jobId, 10);
    return this.dashboardService.getRecruiterJobById(userId, id);
  }

  @Put('recruteur/jobs/:jobId')
  @UseGuards(AuthGuard('jwt'))
  async updateRecruiterJobByJwt(
    @Req() req: any,
    @Param('jobId') jobId: string,
    @Body() body: RecruiterJobPayload,
  ) {
    const userId = await this.dashboardService.resolveJwtUserId(req?.user);
    const id = Number.parseInt(jobId, 10);
    return this.dashboardService.updateRecruiterJob(userId, id, body);
  }

  @Delete('recruteur/jobs/:jobId')
  @UseGuards(AuthGuard('jwt'))
  async deleteRecruiterJobByJwt(@Req() req: any, @Param('jobId') jobId: string) {
    const userId = await this.dashboardService.resolveJwtUserId(req?.user);
    const id = Number.parseInt(jobId, 10);
    return this.dashboardService.deleteRecruiterJob(userId, id);
  }

  @Get('recruteur/overview')
  @UseGuards(AuthGuard('jwt'))
  async getRecruiterOverviewByJwt(@Req() req: any) {
    const userId = await this.dashboardService.resolveJwtUserId(req?.user);
    return this.dashboardService.getRecruiterOverview(userId);
  }

  @Get('recruteur/profile')
  @UseGuards(AuthGuard('jwt'))
  async getRecruiterProfileByJwt(@Req() req: any) {
    const userId = await this.dashboardService.resolveJwtUserId(req?.user);
    return this.dashboardService.getRecruiterProfileByUser(userId);
  }

  @Put('recruteur/profile')
  @UseGuards(AuthGuard('jwt'))
  async upsertRecruiterProfileByJwt(
    @Req() req: any,
    @Body() body: RecruiterProfileUpsertPayload,
  ) {
    const userId = await this.dashboardService.resolveJwtUserId(req?.user);
    return this.dashboardService.upsertRecruiterProfileByUser(userId, body);
  }

  @Get('recruteur/candidats/:candidateId/talentcard-files')
  @UseGuards(AuthGuard('jwt'))
  async getRecruiterCandidateTalentcardFilesByJwt(
    @Req() req: any,
    @Param('candidateId') candidateId: string,
  ) {
    const userId = await this.dashboardService.resolveJwtUserId(req?.user);
    const id = Number.parseInt(candidateId, 10);
    return this.dashboardService.getRecruiterCandidateTalentcardFiles(userId, id);
  }

  @Get('recruteur/candidats/:candidateId/cv-files')
  @UseGuards(AuthGuard('jwt'))
  async getRecruiterCandidateCvFilesByJwt(
    @Req() req: any,
    @Param('candidateId') candidateId: string,
  ) {
    const userId = await this.dashboardService.resolveJwtUserId(req?.user);
    const id = Number.parseInt(candidateId, 10);
    return this.dashboardService.getRecruiterCandidateCvFiles(userId, id);
  }

  @Get('recruteur/candidats/:candidateId/basic-profile')
  @UseGuards(AuthGuard('jwt'))
  async getRecruiterCandidateBasicProfileByJwt(
    @Req() req: any,
    @Param('candidateId') candidateId: string,
  ) {
    const userId = await this.dashboardService.resolveJwtUserId(req?.user);
    const id = Number.parseInt(candidateId, 10);
    return this.dashboardService.getRecruiterCandidateBasicProfile(userId, id);
  }

  @Post('recruteur/jobs/:jobId/status')
  @UseGuards(AuthGuard('jwt'))
  async updateRecruiterJobStatusByJwt(
    @Req() req: any,
    @Param('jobId') jobId: string,
    @Body() body: { status: 'ACTIVE' | 'INACTIVE' },
  ) {
    const userId = await this.dashboardService.resolveJwtUserId(req?.user);
    const id = Number.parseInt(jobId, 10);
    return this.dashboardService.updateRecruiterJobStatus(
      userId,
      id,
      body.status,
    );
  }

  @Post('recruteur/match-by-offre')
  @UseGuards(AuthGuard('jwt'))
  async getRecruiterMatchedCandidatesByOfferByJwt(
    @Req() req: any,
    @Body() body: RecruiterMatchByOfferPayload,
  ) {
    const userId = await this.dashboardService.resolveJwtUserId(req?.user);
    return this.dashboardService.getRecruiterMatchedCandidatesByOffer(userId, body);
  }

<<<<<<< Updated upstream
  @Post('recruteur/candidatures/validate')
  @UseGuards(AuthGuard('jwt'))
  async validateRecruiterCandidateByJwt(
    @Req() req: any,
    @Body() body: RecruiterValidateCandidatePayload,
  ) {
    const userId = await this.dashboardService.resolveJwtUserId(req?.user);
    return this.dashboardService.validateCandidateApplication(userId, body);
  }

  @Post('recruteur/candidatures/status')
  @UseGuards(AuthGuard('jwt'))
  async updateRecruiterCandidateStatusByJwt(
    @Req() req: any,
    @Body() body: RecruiterUpdateCandidateStatusPayload,
  ) {
    const userId = await this.dashboardService.resolveJwtUserId(req?.user);
    return this.dashboardService.updateCandidateApplicationStatus(userId, body);
  }

  @Get('recruteur/planned-interviews')
  @UseGuards(AuthGuard('jwt'))
  async listRecruiterPlannedInterviewsByJwt(@Req() req: any) {
    const userId = await this.dashboardService.resolveJwtUserId(req?.user);
    return this.dashboardService.listRecruiterPlannedInterviews(userId);
  }

  @Get('recruteur/scheduled-interviews')
  @UseGuards(AuthGuard('jwt'))
  async getRecruiterScheduledInterviewByJwt(
    @Req() req: any,
    @Query('job_id') jobIdParam: string,
    @Query('candidate_id') candidateIdParam: string,
  ) {
    const userId = await this.dashboardService.resolveJwtUserId(req?.user);
    const jobId = Number(jobIdParam);
    const candidateId = Number(candidateIdParam);
    return this.dashboardService.getRecruiterScheduledInterviewForApplication(
      userId,
      jobId,
      candidateId,
    );
  }

  @Post('recruteur/scheduled-interviews')
  @UseGuards(AuthGuard('jwt'))
  async scheduleRecruiterInterviewByJwt(
    @Req() req: any,
    @Body() body: RecruiterScheduleInterviewPayload,
  ) {
    const userId = await this.dashboardService.resolveJwtUserId(req?.user);
    return this.dashboardService.scheduleRecruiterInterview(userId, body);
  }

  @Post('recruteur/interview-questions/save-pdf')
  @UseGuards(AuthGuard('jwt'))
  async saveRecruiterInterviewQuestionsPdfByJwt(
    @Req() req: any,
    @Body() body: RecruiterSaveInterviewPdfPayload,
  ) {
    const userId = await this.dashboardService.resolveJwtUserId(req?.user);
    return this.dashboardService.saveInterviewQuestionsPdf(userId, body);
  }

=======
>>>>>>> Stashed changes
  // === Legacy routes with userId in URL ===

  @Get('candidat/user/:userId')
  async getCandidateDashboard(@Param('userId') userId: string) {
    const id = Number.parseInt(userId, 10);
    return this.dashboardService.getCandidateStats(id);
  }

  @Get('candidat/user/:userId/portfolio')
  async getCandidatePortfolio(@Param('userId') userId: string) {
    const id = Number.parseInt(userId, 10);
    return this.dashboardService.getCandidatePortfolio(id);
  }

  @Get('candidat/user/:userId/applications')
  async getCandidateApplications(@Param('userId') userId: string) {
    const id = Number.parseInt(userId, 10);
    return this.dashboardService.getCandidateApplications(id);
  }

  @Get('candidat/user/:userId/cv-files')
  async getCandidateCvFiles(@Param('userId') userId: string) {
    const id = Number.parseInt(userId, 10);
    return this.dashboardService.getCandidateCvFiles(id);
  }

  @Get('candidat/user/:userId/talentcard-files')
  async getCandidateTalentcardFiles(@Param('userId') userId: string) {
    const id = Number.parseInt(userId, 10);
    return this.dashboardService.getCandidateTalentcardFiles(id);
  }

  @Get('candidat/user/:userId/portfolio-pdf-files')
  async getCandidatePortfolioPdfFiles(@Param('userId') userId: string) {
    const id = Number.parseInt(userId, 10);
    return this.dashboardService.getCandidatePortfolioPdfFiles(id);
  }

  // === Versions basées sur candidateId directement ===

  @Get('candidat-id/:candidateId/cv-files')
  async getCandidateCvFilesByCandidateId(
    @Param('candidateId') candidateId: string,
  ) {
    const id = Number.parseInt(candidateId, 10);
    return this.dashboardService.getCandidateCvFilesByCandidateId(id);
  }

  @Get('candidat-id/:candidateId/talentcard-files')
  async getCandidateTalentcardFilesByCandidateId(
    @Param('candidateId') candidateId: string,
  ) {
    const id = Number.parseInt(candidateId, 10);
    return this.dashboardService.getCandidateTalentcardFilesByCandidateId(id);
  }

  @Get('candidat-id/:candidateId/score-json')
  async getCandidateScoreFromJson(@Param('candidateId') candidateId: string) {
    const id = Number.parseInt(candidateId, 10);
    return this.dashboardService.getCandidateScoreFromJson(id);
  }

  @Get('candidat-id/:candidateId/portfolio-pdf-files')
  async getCandidatePortfolioPdfFilesByCandidateId(
    @Param('candidateId') candidateId: string,
  ) {
    const id = Number.parseInt(candidateId, 10);
    return this.dashboardService.getCandidatePortfolioPdfFilesByCandidateId(id);
  }

  @Post('candidat/user/:userId/upload-cv')
  @UseInterceptors(FileInterceptor('file'))
  async uploadCandidateCv(
    @Param('userId') userId: string,
    @UploadedFile() file: any,
  ) {
    const id = Number.parseInt(userId, 10);
    return this.dashboardService.uploadCandidateCv(id, file);
  }

  @Post('recruteur/:userId/jobs')
  async createRecruiterJob(
    @Param('userId') userId: string,
    @Body() body: RecruiterJobPayload,
  ) {
    const id = Number.parseInt(userId, 10);
    return this.dashboardService.createRecruiterJob(id, body);
  }

  @Get('recruteur/:userId/jobs')
  async getRecruiterJobs(@Param('userId') userId: string) {
    const id = Number.parseInt(userId, 10);
    return this.dashboardService.getRecruiterJobsWithCounts(id);
  }

  @Get('recruteur/:userId/overview')
  async getRecruiterOverview(@Param('userId') userId: string) {
    const id = Number.parseInt(userId, 10);
    return this.dashboardService.getRecruiterOverview(id);
  }

  // Offres visibles côté candidat (liste globale des jobs)
  @Get('jobs')
  async getAllJobsForCandidates() {
    return this.dashboardService.getAllJobsForCandidates();
  }

  // Offres recommandées côté candidat (matching IA par embeddings)
  @Get('candidat/matching-jobs')
  @UseGuards(AuthGuard('jwt'))
  async getCandidateMatchingJobsByJwt(@Req() req: any) {
    try {
      return await this.dashboardService.getCandidateMatchingJobs(req?.user);
    } catch {
      return { jobs: [] };
    }
  }

  @Get('candidat/debug-identity')
  @UseGuards(AuthGuard('jwt'))
  async getCandidateDebugIdentityByJwt(@Req() req: any) {
    return this.dashboardService.debugCandidateIdentity(req?.user);
  }

  // Candidature à une offre (candidat)
  @Post('candidat/apply-job')
  @UseGuards(AuthGuard('jwt'))
  async applyJobByJwt(@Req() req: any, @Body() body: ApplyJobPayload) {
    // ApplyJobPayload inclut jobId + chemins de fichiers + lien
    const userId = await this.dashboardService.resolveJwtUserId(req?.user);
    return this.dashboardService.applyToJob(userId, body);
  }

  @Get('candidat/saved-jobs')
  @UseGuards(AuthGuard('jwt'))
  async getCandidateSavedJobsByJwt(@Req() req: any) {
    const userId = await this.dashboardService.resolveJwtUserId(req?.user);
    return this.dashboardService.getCandidateSavedJobs(userId);
  }

  @Post('candidat/saved-jobs/toggle')
  @UseGuards(AuthGuard('jwt'))
  async toggleCandidateSavedJobsByJwt(
    @Req() req: any,
    @Body() body: ToggleSavedJobPayload,
  ) {
    const userId = await this.dashboardService.resolveJwtUserId(req?.user);
    return this.dashboardService.toggleCandidateSavedJob(userId, body);
  }
}

