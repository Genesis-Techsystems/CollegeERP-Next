import { Component, OnInit, VERSION } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { ParametersService } from 'app/main/services/parameters.service';

@Component({
  selector: 'app-exam-bundle-print-stickers',
  templateUrl: './exam-bundle-print-stickers.component.html',
  styleUrls: ['./exam-bundle-print-stickers.component.scss']
})
export class ExamBundlePrintStickersComponent implements OnInit {

  name = 'Angular ' + VERSION.major;
  params: any;
  studentname: any;
  hallticket_number: any;
  omr_serial_no: any;
  omr_barcode: any;
  examName: any;
  collegaName: any;
  collegeName: any;
  bulk: boolean;
  bulkdata: any;
  father_name: any;
  caste: any;
  date_of_birth: any;
  gender: any;
  aadhar_card_no: any;
  printHn: boolean = false
  barcodeNo: boolean = false
  groupedByBundleData = [];
  examGroupCode: any;


  constructor(private route: ActivatedRoute, private router: Router, private parameterService: ParametersService) { }

  ngOnInit(): void {
    this.route.queryParams
      .subscribe(params => {
        this.params = params;
        if (params.data) {
          this.bulk = true;
          this.bulkdata = JSON.parse(params.data);
          this.examGroupCode = params.examGroupCode;
        }
        const grouped = this.groupByScanBundleId(this.bulkdata);
        this.groupedByBundleData = Object.entries(grouped);
        if (this.params.printHn == 'false') {
          this.printHn = false;
        } else {
          this.printHn = true;
        }
        if (this.params.barcodeNo == 'false') {
          this.barcodeNo = false;
        } else {
          this.barcodeNo = true;
        }
      });

  }
  groupByScanBundleId(data: any[]): { [scanBundleId: string]: any[] } {
    return data.reduce((acc, item) => {
      const scanBundleId = item.fk_univ_exam_bundle_id;
      if (!acc[scanBundleId]) {
        acc[scanBundleId] = [];
      }
      acc[scanBundleId].push(item);
      return acc;
    }, {});
  }

  printPage(_printsection: any) {
    window.print();
  }

  printBack() {
    const row = [{
          academicYearId : this.params.academicYearId,
          examGroupId : this.params.examGroupId,
          examCenterId : this.params.examCenterId,
          examDate : this.params.examDate,
          questionPaperCode : this.params.questionPaperCode,
    }]
    this.parameterService.examScanBundlesFiltersData = row;
    this.router.navigate(['admin-examination-management/exam-papers-delivery-process/exam-bundle-print'])
  }

}
